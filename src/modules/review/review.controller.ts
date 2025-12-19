import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IReviewService } from '../../interfaces/review-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';
import { IReviewServices } from '../../interfaces/review.interface';

export class ReviewController {
  private reviewService: IReviewServices;
  private logger: ILoggerService;

  constructor() {
    this.reviewService = DIContainer.resolve<IReviewServices>('ReviewService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  /**
   * GET /api/products/:productId/reviews/summary
   */
  async getRatingSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId;

      const summary = await this.reviewService.getRatingSummary(productId);
      res.json(ResponseUtil.success(summary, 'Rating summary retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }

  /**
   * GET /api/products/:productId/reviews
   */
  async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId;

      const { page, limit, tab, ratings } = req.query;

      const query = {
        productId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        tab: (tab as string) || 'all',
        ratings: (ratings as string) || '',
      };

      const reviews = await this.reviewService.getReviews(query);
      res.json(ResponseUtil.success(reviews, 'Reviews retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }

  /**
   * GET /api/reviews/:reviewId
   */
  async getReviewById(req: Request, res: Response, next: NextFunction) {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        throw new InvalidInputError('Review ID is required');
      }

      const review = await this.reviewService.getReviewById(reviewId);
      res.json(ResponseUtil.success(review, 'Review retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }

  /**
   * POST /api/products/:productId/reviews
   */
  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId;

      const { rating, reviewText, media } = req.body;

      if (!rating) {
        throw new InvalidInputError('Rating is required');
      }

      const reviewData = {
        product_id: productId,
        rating: Number(rating),
        reviewText: reviewText || null,
        media: media || [],
      };

      const review = await this.reviewService.createReview(req.body.user_id, reviewData);
      res.status(201).json(ResponseUtil.success(review, 'Review created successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }

  /**
   * PATCH /api/products/:productId/reviews/:reviewId
   */
  async updateReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        throw new InvalidInputError('Review ID is required');
      }

      //@ts-ignore
      const userId = req.user.id;

      if (!userId) {
        throw new InvalidInputError('User not authenticated');
      }

      const { rating, reviewText, media } = req.body;

      const updateData: any = {};

      if (rating !== undefined) updateData.rating = Number(rating);
      if (reviewText !== undefined) updateData.reviewText = reviewText;
      if (media !== undefined) updateData.media = media;

      const review = await this.reviewService.updateReview(reviewId, userId, updateData);
      res.json(ResponseUtil.success(review, 'Review updated successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }

  /**
   * DELETE /api/products/:productId/reviews/:reviewId
   */
  async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        throw new InvalidInputError('Review ID is required');
      }

      //@ts-ignore
      const userId = req.body.user_id;

      if (!userId) {
        throw new InvalidInputError('User not authenticated');
      }

      await this.reviewService.deleteReview(reviewId, userId);
      res.json(ResponseUtil.success({}, 'Review deleted successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred'));
      }
    }
  }
  async uploadMultipleImages(req: Request, res: Response, next: NextFunction) {
    try {
      const results = [];
      const errors = [];
      const { product_review_id } = req.body;
      console.log('review_id', product_review_id);
      const files = req.files as Express.Multer.File[];

      const result = await this.reviewService.uploadReviewMedia({
        product_review_id: Number(product_review_id),
        files,
      });
      res.json(ResponseUtil.success(result, 'Review media uploaded successfully'));
    } catch (error: any) {
      this.logger.error('Error uploading review media:');
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new InvalidInputError('An unexpected error occurred during media upload'));
      }
    }
  }
}
