import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IProductsService } from '../../interfaces/products-service.interface';
import { Product } from './products.types';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { IConfigService } from '../../services/config.service';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { isUUID } from '../../utils/checkuuid';
import cloudinary from '../../config/cloudinary.config';
import fs from 'fs';

@injectable()
export class ProductsService implements IService, IProductsService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService', 'AuthService'];
  static optionalDependencies: string[] = [];
  private products: Product[] = [
    { id: 1, name: 'Sample Product 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Product 2', createdAt: new Date().toISOString() },
  ];
  private logger: ILoggerService;
  private db: IDatabaseService;
  private config: IConfigService;
  private auth: IAuthService;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    auth: IAuthService,
  ) {
    this.logger = logger;
    this.logger.info('ProductsService instantiated');
    this.db = db;
    this.config = config;
    this.auth = auth;
  }

  async initialize() {
    this.logger.info('ProductsService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      const products = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.READ,
          include: {
            reviews: true,
            category: true,
            images: {
              where: {
                isPrimary: true,
              },
            },
          },
        },
        this.db.client,
        this.logger,
      );
      console.log('products is commingg------------');
      console.log(products);
      return products;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(id: any): Promise<any> {
    try {
      let where: any;
      if (typeof id === 'string' && isUUID(id)) {
        where = { id };
      } else if (!isNaN(Number(id))) {
        where = { product_id: Number(id) };
      } else {
        throw new InvalidInputError('Invalid ID: must be a UUID string or numeric product_id');
      }

      console.log(where);

      const products = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: where,
          include: {
            reviews: true,
            category: true,
            images: true,
            variants: {
              include: { unit: true },
            },
          },
        },
        this.db.client,
        this.logger,
      );
      return products;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: any): Promise<any> {
    try {
      const product = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...data,
          },
        },
        this.db.client,
        this.logger,
      );
      return product;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(id: string, data: any, extraParameters?: any): Promise<any> {
    try {
      const productisExist = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.READ_FIRST,
          where: {
            id: id,
          },
        },
        this.db.client,
        this.logger,
      );
      console.log('product is exist---------------');
      console.log(productisExist);
      if (!productisExist) {
        throw new InvalidInputError('product is not Exist');
      }
      const product = await executePrismaOperation(
        'product',
        {
          operation: PrismaOperationType.UPDATE,
          where: {
            id: productisExist.data.id,
          },
          data: {
            ...data,
            ...extraParameters,
          },
        },
        this.db.client,
        this.logger,
      );
      return product;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async delete(id: number): Promise<boolean> {
    const index = this.products.findIndex((r) => r.id === id);
    if (index === -1) throw new InvalidInputError('Product not found');
    this.products.splice(index, 1);
    return true;
  }

  async createproductvariant(data: any) {
    try {
      const product = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: {
            id: data.product_id,
          },
        },
        this.db.client,
        this.logger,
      );

      if (!product) {
        throw new InvalidInputError('product is not Exist');
      }
      const unit = await executePrismaOperation<any>(
        'unit',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: {
            unit_id: parseInt(data.unit_id),
          },
        },
        this.db.client,
        this.logger,
      );
      console.log('unit is commig-------------');
      console.log(unit);
      if (!unit) {
        throw new InvalidInputError('invalid unit Input');
      }
      const Productvariant = await executePrismaOperation<any>(
        'ProductVariant',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...data,
            product_id: product.data.product_id,
          },
        },
        this.db.client,
        this.logger,
      );
      await this.update(
        product.data.id,
        {},
        {
          stock: {
            increment: Productvariant.data.stock,
          },
        },
      );
      return Productvariant;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async deleteProductVariant(Id: string) {
    try {
      const productVariant = await executePrismaOperation<any>(
        'ProductVariant',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: { id: Id },
        },
        this.db.client,
        this.logger,
      );
      if (!productVariant || !productVariant.data) {
        throw new InvalidInputError('Product variant does not exist.');
      }
      const product = await this.getById(productVariant.data.product_id);
      if (!product || !product.data) {
        throw new InvalidInputError('Associated product not found.');
      }
      await this.update(
        product.data.id,
        {},
        {
          stock: {
            decrement: productVariant.data.stock,
          },
        },
      );
      const deletedVariant = await executePrismaOperation<any>(
        'ProductVariant',
        {
          operation: PrismaOperationType.DELETE,
          where: { id: Id },
        },
        this.db.client,
        this.logger,
      );

      return deletedVariant;
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to delete product variant.');
    }
  }

  async getProductVariantById(id: any): Promise<any> {
    try {
      let where: any;
      if (typeof id === 'string' && isUUID(id)) {
        console.log('uuid is herererrerererer--------');
        where = { id: id };
      } else if (!isNaN(Number(id))) {
        console.log('variance id is hereeeee------------');
        where = { variant_id: Number(id) };
      } else {
        throw new InvalidInputError('Invalid ID: must be a UUID string or numeric product_id');
      }

      const productsvariant = await executePrismaOperation<any>(
        'ProductVariant',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: where,
        },
        this.db.client,
        this.logger,
      );
      console.log(productsvariant);
      // if (productsvariant.data == null) {
      //   throw new InvalidInputError('variance not found');
      // }
      return productsvariant;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  /**
   * Upload single product image
   */
  async uploadSingleImage(uploadData: {
    product_id: number;
    altText?: string;
    isPrimary?: boolean;
    file: Express.Multer.File;
  }) {
    try {
      const { file, ...data } = uploadData;
      console.log('uploaded data is here-------->');
      console.log(data);
      console.log(`🚀 Starting Cloudinary upload for: ${file.originalname}`);
      console.log(`📁 Local file path: ${file.path}`);
      // const product: any = await executePrismaOperation(
      //   'Product',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: {
      //       id: data.product_id,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      console.log('product id is heree---->');
      console.log(data.product_id);
      const product = await this.db.client.product.findUnique({
        where: {
          id: data.product_id,
        },
      });
      console.log(product);
      if (!product) {
        throw new InvalidInputError('product not found');
      }
      console.log('product data is commingg-------->');
      console.log(product);

      // Step 1: Upload to Cloudinary from local file
      const cloudinaryResult = (await cloudinary.uploader.upload(file.path, {
        folder: 'products',
        public_id: `product_${product.product_id}_${Date.now()}`,
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' },
        ],
        resource_type: 'image',
      })) as any;

      console.log(`☁️ Cloudinary upload successful:`);
      console.log(`   URL: ${cloudinaryResult.secure_url}`);
      console.log(`   Public ID: ${cloudinaryResult.public_id}`);
      console.log(`   Size: ${cloudinaryResult.bytes} bytes`);
      console.log('data is comming --------->');
      console.log({
        product_id: product.product_id,
        url: cloudinaryResult.secure_url,
        altText: data.altText || file.originalname,
        isPrimary: data.isPrimary || false,
      });

      // Step 2: Save to database
      // const productImage = await executePrismaOperation(
      //   'ProductImage', // must exactly match Prisma client delegate
      //   {
      //     operation: PrismaOperationType.CREATE,
      //     data: {
      //       product_id: data.product_id,
      //       url: cloudinaryResult.secure_url,
      //       altText: data.altText || file.originalname,
      //       isPrimary: data.isPrimary || false,
      //     },
      //   },
      //   this.db, // your PrismaClient instance
      //   this.logger, // logger service
      // );
      const productImage = await this.db.client.productImage.create({
        data: {
          product_id: product.product_id,
          url: cloudinaryResult.secure_url,
          altText: data.altText || file.originalname,
          isPrimary: data.isPrimary || false,
        },
      });
      console.log('image created sucessfully --------->>>>');
      console.log(productImage);
      // Step 3: Clean up local file
      await this.cleanupLocalFile(file.path);

      return {
        success: true,
        data: {
          ...productImage,
          cloudinary: {
            public_id: cloudinaryResult.public_id,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            format: cloudinaryResult.format,
            bytes: cloudinaryResult.bytes,
          },
        },
        message: 'Image uploaded successfully',
      };
    } catch (error) {
      console.error(`❌ Upload pipeline failed for ${uploadData.file.originalname}:`, error);

      // Clean up local file on error
      await this.cleanupLocalFile(uploadData.file.path);

      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images in sequence
   */
  async uploadMultipleImages(uploadData: { product_id: number; files: Express.Multer.File[] }) {
    const { files, product_id } = uploadData;
    console.log('product id is heree------>');
    console.log(product_id);
    console.log(`📸 Starting batch upload of ${files.length} files for product ${product_id}`);
    // const product = await this.db.client.product.findUnique({
    //   where: {
    //     id: product_id,
    //   },
    // });
    // console.log('product is comming 1234------>');
    // console.log(product);

    const results: any[] = [];
    const errors: any[] = [];

    // Process files sequentially to avoid overwhelming Cloudinary
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`\n🔄 Processing file ${i + 1}/${files.length}: ${file.originalname}`);

        const result = await this.uploadSingleImage({
          product_id: product_id,
          altText: file.originalname,
          isPrimary: i === 0, // First image is primary
          file,
        });

        results.push(result.data);
        console.log(`✅ File ${i + 1}/${files.length} completed successfully`);
      } catch (error) {
        console.error(`❌ File ${i + 1}/${files.length} failed: ${file.originalname}`, error);
        errors.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`\n📊 Batch upload summary:`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Successful: ${results.length}`);
    console.log(`   Failed: ${errors.length}`);

    return {
      success: results.length > 0,
      data: results,
      errors: errors,
      summary: {
        total: files.length,
        uploaded: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Get all images for a product
   */
  async getProductImages(product_id: number) {
    try {
      // const images: any = await executePrismaOperation(
      //   'ProductImage',
      //   {
      //     operation: PrismaOperationType.Rea,
      //     where: {
      //       product_id,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      const images: any = await this.db.client.productImage.findMany({
        where: {
          product_id,
        },
      });

      // const images: any = await executePrismaOperation(
      //   'productImage',
      //   {
      //     operation: PrismaOperationType.READ,
      //     where: {
      //       product_id: product_id,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );

      return {
        success: true,
        data: images,
        count: images.length,
      };
    } catch (error) {
      console.error('Error fetching product images:', error);
      throw new Error('Failed to fetch product images');
    }
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(imageId: number) {
    try {
      // const image: any = await executePrismaOperation(
      //   'ProductImage',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: {
      //       id: imageId,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      const image: any = await this.db.client.productImage.findUnique({
        where: {
          id: imageId,
        },
      });

      if (!image) {
        throw new Error('Image not found in database');
      }

      // Extract public_id from Cloudinary URL
      const publicId: any = this.extractPublicIdFromUrl(image.url);

      if (publicId) {
        console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
        const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
        console.log(`☁️ Cloudinary deletion result:`, cloudinaryResult);
      }

      // await executePrismaOperation(
      //   'productImage',
      //   {
      //     operation: PrismaOperationType.DELETE,
      //     where: {
      //       id: imageId,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      await this.db.client.productImage.delete({
        where: {
          id: imageId,
        },
      });

      console.log(`💾 Database record deleted - ID: ${imageId}`);

      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error(
        `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Set primary image for a product
   */
  async setPrimaryProductImage(imageId: number) {
    try {
      // const image: any = await executePrismaOperation(
      //   'ProductImage',
      //   {
      //     operation: PrismaOperationType.READ_UNIQUE,
      //     where: {
      //       id: imageId,
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      const image: any = this.db.client.productImage.findUnique({
        where: {
          id: imageId,
        },
      });
      if (!image) {
        throw new Error('Image not found in database');
      }
      // Update in transaction
      await this.db.client.$transaction(async (tx: any) => {
        // Remove primary status from all images of this product
        await tx.productImage.updateMany({
          where: { product_id: image.product_id },
          data: { isPrimary: false },
        });

        // Set the selected image as primary
        await tx.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        });
      });

      console.log(`🌟 Primary image set - ID: ${imageId}`);

      return {
        success: true,
        message: 'Primary image updated successfully',
      };
    } catch (error) {
      console.error('Error setting primary image:', error);
      throw new Error('Failed to set primary image');
    }
  }

  /**
   * Update product image details
   */
  async updateProductImage(imageId: number, updateData: any) {
    try {
      // const image = await executePrismaOperation(
      //   'ProductImage',
      //   {
      //     operation: PrismaOperationType.UPDATE,
      //     where: { id: imageId },
      //     data: {
      //       ...updateData,
      //       updatedAt: new Date(),
      //     },
      //   },
      //   this.db,
      //   this.logger,
      // );
      const image = await this.db.client.productImage.update({
        where: { id: imageId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      if (!image) {
        throw new Error('Image not found or update failed');
      }

      console.log(`✅ Product image updated successfully - ID: ${imageId}`);

      return {
        success: true,
        data: image,
        message: 'Image updated successfully',
      };
    } catch (error) {
      console.error('Error updating product image:', error);
      throw new Error('Failed to update image');
    }
  }

  // =================== HELPER METHODS ===================

  /**
   * Clean up local file
   */
  async cleanupLocalFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🧹 Local file cleaned up: ${filePath}`);
      }
    } catch (error) {
      console.error(`⚠️ Failed to cleanup local file: ${filePath}`, error);
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  async extractPublicIdFromUrl(url: string) {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');

      if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
        return publicId;
      }

      return null;
    } catch (error) {
      console.error('Error extracting public_id:', error);
      return null;
    }
  }

  /**
   * Get product with images
   */
  async getProductWithImages(productId: number) {
    try {
      const product = await executePrismaOperation(
        'Product',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: { product_id: productId },
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
        this.db,
        this.logger,
      );

      if (!product) {
        throw new Error('Product not found');
      }

      return {
        success: true,
        data: product,
        message: 'Product with images retrieved successfully',
      };
    } catch (error) {
      console.error('Error fetching product with images:', error);
      throw new Error('Failed to fetch product with images');
    }
  }

  /**
   * Get products with primary images only
   */
  async getProductsWithPrimaryImages() {
    try {
      const products: any = await executePrismaOperation(
        'Product',
        {
          operation: PrismaOperationType.READ,
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        this.db,
        this.logger,
      );

      return {
        success: true,
        data: products,
        count: products.length,
        message: 'Products with primary images retrieved successfully',
      };
    } catch (error) {
      console.error('Error fetching products with primary images:', error);
      throw new Error('Failed to fetch products with primary images');
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(searchTerm: string) {
    try {
      const products: any = await executePrismaOperation(
        'Product',
        {
          operation: PrismaOperationType.READ,
          where: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        this.db,
        this.logger,
      );

      return {
        success: true,
        data: products,
        count: products.length,
        message: `Found ${products.length} products matching "${searchTerm}"`,
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  async addToWishlist(userId: any, productId: any) {
    try {
      console.log('Add to wishlist service called with:', { userId, productId });
      const product = await this.db.client.product.findUnique({
        where: {
          id: productId,
        },
      });
      if (!product) {
        throw new InvalidInputError('product not found');
      }
      const user = await this.db.client.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new InvalidInputError('user not found');
      }
      const existingItem = await this.db.client.wishlist.findFirst({
        where: {
          user_id: user.user_id,
          product_id: product.product_id,
        },
      });
      if (existingItem) {
        throw new InvalidInputError('Item already in wishlist');
      }

      const wishlistItem = await this.db.client.wishlist.create({
        data: {
          user_id: user.user_id,
          product_id: product.product_id,
        },
        include: {
          product: true,
        },
      });

      return {
        success: true,
        data: wishlistItem,
        count: wishlistItem.length,
        message: `Found ${wishlistItem.length} products matching "${wishlistItem}"`,
      };
    } catch (error) {
      throw error;
    }
  }

  async removeFromWishlist(wishlistId: any, userId: any) {
    try {
      // Check if item exists and belongs to user
      const existingItem = await this.db.client.wishlist.findUnique({
        where: { uuid: wishlistId },
      });

      if (!existingItem) {
        throw new Error('Wishlist item not found');
      }

      //here please send the userId on number
      if (existingItem.user_id !== parseInt(userId)) {
        throw new Error('Unauthorized access');
      }

      await this.db.client.wishlist.delete({
        where: { uuid: wishlistId },
      });

      return { message: 'Item removed successfully' };
    } catch (error) {
      throw error;
    }
  }

  async clearWishlist(userId: any) {
    try {
      await this.db.client.wishlist.deleteMany({
        where: { user_id: parseInt(userId) },
      });
      return { message: 'Wishlist cleared successfully' };
    } catch (error) {
      throw error;
    }
  }
  async getWishlistByUserId(userId: any) {
    try {
      const wishlistItems = await this.db.client.wishlist.findMany({
        where: { user_id: parseInt(userId) },
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });
      return {
        success: true,
        data: wishlistItems,
        count: wishlistItems.length,
        message: 'Wishlist items retrieved successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}
