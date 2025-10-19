// import { NextFunction, Request, Response } from 'express';
// import { ResponseUtil } from '../../utils/responce.utils';
// import { DIContainer } from '../../services/di-container';
// import { IProductsService } from '../../interfaces/products-service.interface';
// import { ILoggerService } from '../../services/logger.service';
// import { AppError, InvalidInputError } from '../../utils/error.utils';

// export class ProductsController {
//   private productsService: IProductsService;
//   private logger: ILoggerService;

//   constructor() {
//     this.productsService = DIContainer.resolve<IProductsService>('ProductsService');
//     this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
//   }

//   async getAll(req: Request, res: Response) {
//     const result = await this.productsService.getAll();
//     res.json(ResponseUtil.success(result, 'Products list'));
//   }

//   async getById(req: Request, res: Response) {
//     const item = await this.productsService.getById(req.params.id);
//     res.json(ResponseUtil.success(item, 'Product found'));
//   }

//   async create(req: Request, res: Response) {
//     const item = await this.productsService.create(req.body);
//     res.status(201).json(ResponseUtil.success(item, 'Product created'));
//   }

//   async update(req: Request, res: Response) {
//     const item = await this.productsService.update(req.params.id, req.body);
//     res.json(ResponseUtil.success(item, 'Product updated'));
//   }

//   async delete(req: Request, res: Response) {
//     await this.productsService.delete(parseInt(req.params.id));
//     res.json(ResponseUtil.success(null, 'Product deleted'));
//   }
//   async productvariant(req: Request, res: Response, next: NextFunction) {
//     try {
//       const item = await this.productsService.createproductvariant(req.body);
//       res.json(ResponseUtil.success(item, 'Get All user'));
//     } catch (error) {
//       if (error instanceof AppError) {
//         next(
//           error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
//         );
//       }
//     }
//   }
//   async deleteproductvariant(req: Request, res: Response, next: NextFunction) {
//     try {
//       const item = await this.productsService.deleteProductVariant(req.params.id);
//       res.json(ResponseUtil.success(item, 'Delete item sucessfully'));
//     } catch (error) {
//       if (error instanceof AppError) {
//         next(
//           error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
//         );
//       }
//     }
//   }
// }

import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IProductsService } from '../../interfaces/products-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';
import multer from 'multer';

export class ProductsController {
  private productsService: IProductsService;
  private logger: ILoggerService;

  constructor() {
    this.productsService = DIContainer.resolve<IProductsService>('ProductsService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  // =================== BASIC PRODUCT CRUD ===================

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.productsService.getAll();
      res.json(ResponseUtil.success(result, 'Products list'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to retrieve products'),
      );
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) {
        throw new InvalidInputError('Product ID is required');
      }
      const item = await this.productsService.getById(req.params.id);
      res.json(ResponseUtil.success(item, 'Product found'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to retrieve product'));
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Product data is required');
      }
      const item = await this.productsService.create(req.body);
      res.status(201).json(ResponseUtil.success(item, 'Product created'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to create product'));
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) {
        throw new InvalidInputError('Product ID is required');
      }
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Update data is required');
      }
      const item = await this.productsService.update(req.params.id, req.body);
      res.json(ResponseUtil.success(item, 'Product updated'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to update product'));
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id || isNaN(parseInt(req.params.id))) {
        throw new InvalidInputError('Valid Product ID is required');
      }
      await this.productsService.delete(parseInt(req.params.id));
      res.json(ResponseUtil.success(null, 'Product deleted'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to delete product'));
    }
  }

  // =================== PRODUCT VARIANTS ===================

  async productvariant(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Product variant data is required');
      }
      const item = await this.productsService.createproductvariant(req.body);
      res.json(ResponseUtil.success(item, 'Product variant created successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to create product variant'),
      );
    }
  }

  async deleteproductvariant(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) {
        throw new InvalidInputError('Product variant ID is required');
      }
      const item = await this.productsService.deleteProductVariant(req.params.id);
      res.json(ResponseUtil.success(item, 'Product variant deleted successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to delete product variant'),
      );
    }
  }

  // =================== IMAGE UPLOAD METHODS ===================

  /**
   * Upload single product image
   */
  async uploadSingleImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new InvalidInputError('No image file provided');
      }

      const { product_id, altText, isPrimary } = req.body;
      if (!product_id) {
        throw new InvalidInputError('Valid Product ID is required');
      }

      const uploadData = {
        product_id: product_id,
        altText: altText || req.file.originalname,
        isPrimary: isPrimary === 'true' || isPrimary === true,
        file: req.file,
      };

      const result = await this.productsService.uploadSingleImage(uploadData);
      res.status(201).json(ResponseUtil.success(result, 'Image uploaded successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to upload image'));
    }
  }

  /**
   * Upload multiple product images
   */
  async uploadMultipleImages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new InvalidInputError('No image files provided');
      }

      const { product_id } = req.body;
      if (!product_id) {
        throw new InvalidInputError('Valid Product ID is required');
      }

      const uploadData = {
        product_id: product_id,
        files: req.files,
      };

      const result = await this.productsService.uploadMultipleImages(uploadData);

      // Handle partial success scenarios
      const status = result.success ? (result.errors?.length > 0 ? 207 : 201) : 400;
      res.status(status).json(ResponseUtil.success(result, 'Images upload completed'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to upload images'));
    }
  }

  /**
   * Get all images for a product
   */
  async getProductImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      if (!productId || isNaN(parseInt(productId))) {
        throw new InvalidInputError('Valid Product ID is required');
      }

      const result = await this.productsService.getProductImages(parseInt(productId));
      res.json(ResponseUtil.success(result, 'Product images retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve product images'),
      );
    }
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      if (!imageId || isNaN(parseInt(imageId))) {
        throw new InvalidInputError('Valid Image ID is required');
      }

      const result = await this.productsService.deleteProductImage(parseInt(imageId));
      res.json(ResponseUtil.success(result, 'Image deleted successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to delete image'));
    }
  }

  /**
   * Set primary image for a product
   */
  async setPrimaryProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      if (!imageId || isNaN(parseInt(imageId))) {
        throw new InvalidInputError('Valid Image ID is required');
      }

      const result = await this.productsService.setPrimaryProductImage(parseInt(imageId));
      res.json(ResponseUtil.success(result, 'Primary image updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to set primary image'),
      );
    }
  }

  /**
   * Update product image details
   */
  async updateProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      const { altText, isPrimary } = req.body;

      if (!imageId || isNaN(parseInt(imageId))) {
        throw new InvalidInputError('Valid Image ID is required');
      }

      const updateData: any = {};
      if (altText !== undefined && altText !== null) updateData.altText = altText;
      if (isPrimary !== undefined && isPrimary !== null) updateData.isPrimary = isPrimary;

      if (Object.keys(updateData).length === 0) {
        throw new InvalidInputError('No valid update data provided');
      }

      const result = await this.productsService.updateProductImage(parseInt(imageId), updateData);
      res.json(ResponseUtil.success(result, 'Image updated successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to update image'));
    }
  }

  /**
   * Handle multer errors specifically
   */
  handleMulterError(error: any, req: Request, res: Response, next: NextFunction) {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      let errorMessage = 'File upload error';

      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File too large. Maximum size is 5MB per file';
          break;
        case 'LIMIT_FILE_COUNT':
          errorMessage = 'Too many files. Maximum is 10 files at once';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = `Unexpected field name '${error.field}' in form data`;
          break;
        default:
          errorMessage = error.message || 'Unknown file upload error';
      }

      next(new InvalidInputError(errorMessage));
    } else if (
      error.message &&
      error.message.includes('Only .png, .jpg, .jpeg and .webp formats allowed')
    ) {
      next(new InvalidInputError(error.message));
    } else {
      next(new InvalidInputError(error.message || 'File upload failed'));
    }
  }
  // Add item to wishlist
  async addToWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id, product_id } = req.body;
      console.log('Add to wishlist request body:', req.body);

      if (!user_id || !product_id) {
        // REMOVE 'return' here
        res.status(400).json({
          success: false,
          message: 'user_id and product_id are required',
        });
        return; // Keep this return (it returns void)
      }

      const result = await this.productsService.addToWishlist(user_id, product_id);

      res.status(201).json({
        success: true,
        message: 'Item added to wishlist successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Add to wishlist error:', error);
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async clearWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        // REMOVE 'return' here
        res.status(400).json({
          success: false,
          message: 'user_id is required',
        });
        return; // Keep this return (it returns void)
      }

      await this.productsService.clearWishlist(user_id);

      res.status(200).json({
        success: true,
        message: 'Wishlist cleared successfully',
      });
    } catch (error: any) {
      console.error('Clear wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  // Remove item from wishlist
  async removeFromWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { wishlist_id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        // REMOVE 'return' here
        res.status(400).json({
          success: false,
          message: 'user_id is required',
        });
        return; // Keep this return (it returns void)
      }

      await this.productsService.removeFromWishlist(wishlist_id, user_id);

      res.status(200).json({
        success: true,
        message: 'Item removed from wishlist successfully',
      });
    } catch (error: any) {
      console.error('Remove from wishlist error:', error);

      if (error.message === 'Wishlist item not found') {
        // REMOVE 'return' here
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return; // Keep this return (it returns void)
      }

      if (error.message === 'Unauthorized access') {
        // REMOVE 'return' here
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return; // Keep this return (it returns void)
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
  async getWishlistByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new InvalidInputError('User ID is required');
      }

      const wishlistItems = await this.productsService.getWishlistByUserId(userId);
      res.json(ResponseUtil.success(wishlistItems, 'Wishlist items retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve wishlist items'),
      );
    }
  }
}
