import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IReviewService } from '../../interfaces/review-service.interface';
import { CreateReviewInput, UpdateReviewInput, ReviewListQuery } from './review.types';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import _ from 'lodash';
import { IReviewServices } from '../../interfaces/review.interface';
import { IProductsService } from '../../interfaces/products-service.interface';
import cloudinary from '../../config/cloudinary.config';

@injectable()
export class ReviewService implements IService, IReviewServices {
  static dependencies = ['LoggerService', 'DatabaseService', 'ProductsService'];
  static optionalDependencies: string[] = [];

  private db: IDatabaseService;
  private logger: ILoggerService;
  private product: IProductsService;

  constructor(logger: ILoggerService, db: IDatabaseService, product: IProductsService) {
    this.logger = logger;
    this.db = db;
    this.logger.info('ReviewService instantiated');
    this.product = product;
  }

  async initialize() {
    this.logger.info('ReviewService initialized');
  }

  /**
   * Get rating summary for a product
   */
  async getRatingSummary(productId: string): Promise<any> {
    try {
      // Check if product exists
      // const product: any = await executePrismaOperation(
      //   'product',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: { id: productId },
      //   },
      //   this.db.client,
      //   this.logger,
      // );
      const product: any = await this.db.client.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new InvalidInputError('Product not found');
      }

      // Try to get cached summary first
      const cachedSummary = await this.db.client.ratingSummary.findUnique({
        where: { product_id: product.product_id },
      });

      if (cachedSummary) {
        return {
          averageRating: parseFloat(cachedSummary.avgRating.toFixed(1)),
          totalReviews: cachedSummary.totalReviews,
          counts: {
            1: cachedSummary.count1,
            2: cachedSummary.count2,
            3: cachedSummary.count3,
            4: cachedSummary.count4,
            5: cachedSummary.count5,
          },
        };
      }

      // If no cached summary, calculate from reviews
      // const reviews: any = await executePrismaOperation(
      //   'productReview',
      //   {
      //     operation: PrismaOperationType.READ,
      //     where: {
      //       product_id: productId,
      //       status: 'APPROVED',
      //     },
      //     select: {
      //       rating: true,
      //     },
      //   },
      //   this.db.client,
      //   this.logger,
      // );
      const reviews = await this.db.client.productReview.findMany({
        where: {
          id: productId,
          status: 'APPROVED',
        },
        select: {
          rating: true,
        },
      });

      const reviewList = reviews || [];
      const totalReviews = reviewList.length;
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      reviewList.forEach((r: any) => {
        if (r.rating >= 1 && r.rating <= 5) {
          counts[r.rating as keyof typeof counts]++;
        }
      });

      const avgRating =
        totalReviews > 0
          ? reviewList.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
          : 0;

      // Cache the summary
      await this.updateRatingSummaryCache(productId);

      return {
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalReviews,
        counts: {
          1: counts[1],
          2: counts[2],
          3: counts[3],
          4: counts[4],
          5: counts[5],
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to get rating summary');
    }
  }

  /**
   * Get reviews list with filters and pagination
   */
  async getReviews(query: ReviewListQuery): Promise<any> {
    try {
      const { productId, page = 1, limit = 10, tab = 'all', ratings = '' } = query;

      // Check if product exists
      // const product: any = await executePrismaOperation(
      //   'product',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: { product_id: productId },
      //   },
      //   this.db.client,
      //   this.logger,
      // );

      const product: any = await this.db.client.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new InvalidInputError('Product not found');
      }

      // Build where clause
      const where: any = {
        product_id: product.product_id,
        status: 'APPROVED',
      };

      // Filter by rating
      if (ratings) {
        const ratingArray = ratings
          .split(',')
          .map(Number)
          .filter((r) => r >= 1 && r <= 5);
        if (ratingArray.length > 0) {
          where.rating = { in: ratingArray };
        }
      }

      // Filter by tab
      if (tab === 'media') {
        where.media = { some: {} };
      } else if (tab === 'description') {
        where.reviewText = { not: null };
        where.NOT = { reviewText: '' };
      }

      const skip = (page - 1) * limit;

      // Get reviews with pagination
      const [items, total] = await Promise.all([
        this.db.client.productReview.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: true,
              },
            },
            media: {
              select: {
                id: true,
                url: true,
                type: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.client.productReview.count({ where }),
      ]);

      // Format response
      const formattedItems = items.map((review: any) => ({
        id: review.id,
        product_review_id: review.product_review_id,
        rating: review.rating,
        reviewText: review.reviewText,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        media: review.media || [],
        user: {
          id: review.user.id,
          name: review.user.name,
        },
      }));

      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        items: formattedItems,
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to get reviews');
    }
  }

  /**
   * Get single review by ID
   */
  async getReviewById(reviewId: string): Promise<any> {
    try {
      const review = await this.db.client.productReview.findUnique({
        where: { id: reviewId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!review) {
        throw new InvalidInputError('Review not found');
      }

      return {
        id: review.id,
        product_review_id: review.product_review_id,
        rating: review.rating,
        reviewText: review.reviewText,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        media: review.media || [],
        user: {
          id: review.user.id,
          name: review.user.name,
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to get review');
    }
  }

  /**
   * Create new review
   */
  async createReview(userId: string, data: CreateReviewInput): Promise<any> {
    try {
      const { product_id, rating, reviewText, media = [] } = data;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        throw new InvalidInputError('Rating must be between 1 and 5');
      }

      // Check if product exists
      // const product: any = await executePrismaOperation(
      //   'product',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: { id: product_id },
      //   },
      //   this.db.client,
      //   this.logger,
      // );
      const product: any = await this.db.client.product.findUnique({
        where: { id: product_id },
      });

      if (!product) {
        throw new InvalidInputError('Product not found');
      }

      // const user: any = await executePrismaOperation(
      //   'user',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: { id: userId },
      //   },
      //   this.db.client,
      //   this.logger,
      // );
      const user: any = await this.db.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new InvalidInputError('User not found');
      }

      const userUserId = user.user_id;

      // Check if user already reviewed this product
      // const existingReview: any = await executePrismaOperation(
      //   'productReview',
      //   {
      //     operation: PrismaOperationType.READ,
      //     where: {
      //       product_id,
      //       user_id: userUserId,
      //     },
      //   },
      //   this.db.client,
      //   this.logger,
      // );

      const existingReview = await this.db.client.productReview.findMany({
        where: {
          product_id: product.product_id,
          user_id: userUserId,
        },
      });
      console.log('existingReview', existingReview);

      if (existingReview && existingReview && existingReview.length > 0) {
        throw new InvalidInputError('You have already reviewed this product');
      }

      // Create review with media
      const review = await this.db.client.productReview.create({
        data: {
          product_id: product.product_id,
          user_id: userUserId,
          rating,
          reviewText: reviewText || null,
          status: 'APPROVED', // Default pending for moderation
          media: {
            create: media.map((m: any) => ({
              url: m.url,
              type: m.type,
            })),
          },
        },
        include: {
          media: true,
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
        },
      });

      // Update rating summary cache (even for pending reviews)
      await this.updateRatingSummaryCache(product_id);

      return {
        id: review.id,
        product_review_id: review.product_review_id,
        rating: review.rating,
        reviewText: review.reviewText,
        status: review.status,
        createdAt: review.createdAt,
        media: review.media || [],
        user: {
          id: review.user.id,
          name: review.user.name,
          avatarUrl: review.user.profile?.avatarUrl || null,
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to create review');
    }
  }

  /**
   * Update existing review
   */
  async updateReview(reviewId: string, userId: string, data: UpdateReviewInput): Promise<any> {
    try {
      const { rating, reviewText, media } = data;

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        throw new InvalidInputError('Rating must be between 1 and 5');
      }

      // Check if review exists
      const existingReview = await this.db.client.productReview.findUnique({
        where: { id: reviewId },
        include: {
          user: true,
        },
      });

      if (!existingReview) {
        throw new InvalidInputError('Review not found');
      }

      // Get user's user_id
      const user: any = await executePrismaOperation(
        'user',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: { id: userId },
        },
        this.db.client,
        this.logger,
      );

      if (!user || !user.data) {
        throw new InvalidInputError('User not found');
      }

      // Check ownership
      if (existingReview.user_id !== user.data.user_id) {
        throw new InvalidInputError('You can only update your own reviews');
      }

      // Delete old media if new media provided
      if (media !== undefined) {
        await this.db.client.reviewMedia.deleteMany({
          where: { product_review_id: existingReview.product_review_id },
        });
      }

      // Build update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (rating !== undefined) updateData.rating = rating;
      if (reviewText !== undefined) updateData.reviewText = reviewText || null;

      if (media !== undefined) {
        updateData.media = {
          create: media.map((m: any) => ({
            url: m.url,
            type: m.type,
          })),
        };
      }

      // Update review
      const updatedReview = await this.db.client.productReview.update({
        where: { id: reviewId },
        data: updateData,
        include: {
          media: true,
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Update rating summary cache if rating changed
      if (rating !== undefined) {
        await this.updateRatingSummaryCache(existingReview.product_id);
      }

      return {
        id: updatedReview.id,
        product_review_id: updatedReview.product_review_id,
        rating: updatedReview.rating,
        reviewText: updatedReview.reviewText,
        status: updatedReview.status,
        updatedAt: updatedReview.updatedAt,
        media: updatedReview.media || [],
        user: {
          id: updatedReview.user.id,
          name: updatedReview.user.name,
          avatarUrl: updatedReview.user.profile?.avatarUrl || null,
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to update review');
    }
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string): Promise<string> {
    try {
      // Check if review exists
      const existingReview = await this.db.client.productReview.findUnique({
        where: { id: reviewId },
      });
      console.log('existingReview', existingReview);

      if (!existingReview) {
        throw new InvalidInputError('Review not found');
      }

      // Get user's user_id
      // const user: any = await executePrismaOperation(
      //   'user',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: { id: userId },
      //   },
      //   this.db.client,
      //   this.logger,
      // );
      const user: any = await this.db.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new InvalidInputError('User not found');
      }

      // Check ownership
      if (existingReview.user_id !== user.user_id) {
        throw new InvalidInputError('You can only delete your own reviews');
      }

      // Delete review (cascade will delete media)
      await this.db.client.productReview.delete({
        where: { id: reviewId },
      });

      // Update rating summary cache
      await this.updateRatingSummaryCache(existingReview.id);

      return 'review deleted successfully';
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to delete review');
    }
  }

  /**
   * Helper: Update rating summary cache
   */
  private async updateRatingSummaryCache(productId: string): Promise<void> {
    try {
      // Get all approved reviews for product
      const product: any = await this.db.client.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new InvalidInputError('Product not found');
      }
      const reviews = await this.db.client.productReview.findMany({
        where: {
          product_id: product.product_id,
          status: 'APPROVED',
        },
        select: { rating: true },
      });

      const totalReviews = reviews.length;
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      // Count ratings
      reviews.forEach((r: any) => {
        if (r.rating >= 1 && r.rating <= 5) {
          counts[r.rating as keyof typeof counts]++;
        }
      });

      // Calculate average
      const avgRating =
        totalReviews > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
          : 0;

      // Upsert summary
      await this.db.client.ratingSummary.upsert({
        where: { product_id: product.product_id },
        create: {
          product_id: product.product_id,
          avgRating,
          totalReviews,
          count1: counts[1],
          count2: counts[2],
          count3: counts[3],
          count4: counts[4],
          count5: counts[5],
        },
        update: {
          avgRating,
          totalReviews,
          count1: counts[1],
          count2: counts[2],
          count3: counts[3],
          count4: counts[4],
          count5: counts[5],
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error('Error updating rating summary cache:');
      // Don't throw error, just log it
    }
  }
  async uploadReviewMedia(uploadData: any) {
    const { product_review_id, files } = uploadData;

    // 1️⃣ Validate review exists
    console.log('product_review_id', product_review_id);
    const review = await this.db.client.productReview.findUnique({
      where: { product_review_id },
    });
    console.log('review', review);
    if (!review) {
      throw new InvalidInputError(`Review with id ${product_review_id} not found`);
    }

    if (!files || !files.length) {
      throw new InvalidInputError('No files uploaded');
    }

    const uploadedMedia = [];

    for (const file of files) {
      try {
        // 2️⃣ Upload to Cloudinary (auto detects type)
        const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
          folder: 'review_media',
          public_id: `review_${product_review_id}_${Date.now()}`,
          resource_type: 'auto',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        });

        // 3️⃣ Save record in DB
        const record = await this.db.client.reviewMedia.create({
          data: {
            product_review_id,
            url: cloudinaryResult.secure_url,
            type: cloudinaryResult.resource_type, // "image" or "video"
          },
        });

        uploadedMedia.push(record);
      } catch (err) {
        console.error('Cloudinary upload failed:', err);
        throw new InvalidInputError('Media upload failed');
      }
    }

    return {
      success: true,
      message: 'Media uploaded successfully',
      data: uploadedMedia,
    };
  }
}
