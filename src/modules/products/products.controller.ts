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
      const result = await this.productsService.getAll(req.body);
      res.json(ResponseUtil.success(result, 'Products list retrieved successfully'));
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
      res.status(201).json(ResponseUtil.success(item, 'Product created successfully'));
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
      res.json(ResponseUtil.success(item, 'Product updated successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to update product'));
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) {
        throw new InvalidInputError('Valid Product ID is required');
      }
      await this.productsService.delete(req.params.id);
      res.json(ResponseUtil.success(null, 'Product deleted successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to delete product'));
    }
  }

  // =================== PRODUCT COLOR MANAGEMENT ===================

  async getAllColors(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      console.log('product id is comminggggg');
      console.log(productId);
      // if (!productId || isNaN(parseInt(productId))) {
      //   throw new InvalidInputError('Valid Product ID is required');
      // }
      const result = await this.productsService.getAllColorsByProduct(productId);
      res.json(ResponseUtil.success(result, 'Product colors retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve product colors'),
      );
    }
  }

  async createColor(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.productsService.createColor(req.body);
      res.status(201).json(ResponseUtil.success(item, 'Product color created successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to create product color'),
      );
    }
  }

  async updateColor(req: Request, res: Response, next: NextFunction) {
    try {
      const { colorId } = req.params;

      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Update data is required');
      }
      const item = await this.productsService.updateColor(colorId, req.body);
      res.json(ResponseUtil.success(item, 'Product color updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to update product color'),
      );
    }
  }

  async deleteColor(req: Request, res: Response, next: NextFunction) {
    try {
      const { colorId } = req.params;
      if (!colorId) {
        throw new InvalidInputError('Valid Color ID is required');
      }
      await this.productsService.deleteColor(colorId);
      res.json(ResponseUtil.success(null, 'Product color deleted successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to delete product color'),
      );
    }
  }

  // =================== PRODUCT COLOR IMAGES ===================

  async getColorImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { colorId } = req.params;
      const result = await this.productsService.getColorImages(colorId);
      res.json(ResponseUtil.success(result, 'Color images retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve color images'),
      );
    }
  }
  async uploadMultipleColorImages(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Multiple color images upload request received----->');
      console.log('Files:', req.files);
      console.log('Body:', req.body);

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new InvalidInputError('No image files provided');
      }

      const { product_color_id } = req.body;
      if (!product_color_id) {
        throw new InvalidInputError('Valid Product Color ID is required');
      }

      const uploadData = {
        product_color_id: product_color_id,
        files: req.files,
      };

      const result = await this.productsService.uploadMultipleColorImages(uploadData);

      // Handle partial success scenarios
      // 207 = Multi-Status (some succeeded, some failed)
      // 201 = Created (all succeeded)
      // 400 = Bad Request (all failed)
      const status = result.success ? (result.errors?.length > 0 ? 207 : 201) : 400;

      res.status(status).json(ResponseUtil.success(result, 'Color images upload completed'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to upload color images'),
      );
    }
  }

  async updateColorImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      if (!imageId || isNaN(parseInt(imageId))) {
        throw new InvalidInputError('Valid Image ID is required');
      }
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Update data is required');
      }
      const result = await this.productsService.updateColorImage(parseInt(imageId), req.body);
      res.json(ResponseUtil.success(result, 'Color image updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to update color image'),
      );
    }
  }

  async deleteColorImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      if (!imageId || isNaN(parseInt(imageId))) {
        throw new InvalidInputError('Valid Image ID is required');
      }
      await this.productsService.deleteColorImage(parseInt(imageId));
      res.json(ResponseUtil.success(null, 'Color image deleted successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to delete color image'),
      );
    }
  }

  // =================== PRODUCT SIZE VARIANTS ===================

  async getSizeVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const { colorId } = req.params;
      if (!colorId) {
        throw new InvalidInputError('Valid Color ID is required');
      }
      const result = await this.productsService.getSizeVariantsByColor(colorId);
      res.json(ResponseUtil.success(result, 'Size variants retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve size variants'),
      );
    }
  }

  async createSizeVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.productsService.createSizeVariant(req.body);
      res.status(201).json(ResponseUtil.success(item, 'Size variant created successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to create size variant'),
      );
    }
  }

  async updateSizeVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      // if (!variantId || isNaN(parseInt(variantId))) {
      //   throw new InvalidInputError('Valid Variant ID is required');
      // }
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new InvalidInputError('Update data is required');
      }
      const item = await this.productsService.updateSizeVariant(variantId, req.body);
      res.json(ResponseUtil.success(item, 'Size variant updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to update size variant'),
      );
    }
  }

  async deleteSizeVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      await this.productsService.deleteSizeVariant(variantId);
      res.json(ResponseUtil.success(null, 'Size variant deleted successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to delete size variant'),
      );
    }
  }

  // =================== PRODUCT IMAGES (General Product Level) ===================

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
      const status = result.success ? (result.errors?.length > 0 ? 207 : 201) : 400;
      res.status(status).json(ResponseUtil.success(result, 'Images upload completed'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to upload images'));
    }
  }

  async getProductImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      if (!productId) {
        throw new InvalidInputError('Valid Product ID is required');
      }
      const result = await this.productsService.getProductImages(productId);
      res.json(ResponseUtil.success(result, 'Product images retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve product images'),
      );
    }
  }

  async deleteProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      if (!imageId) {
        throw new InvalidInputError('Valid Image ID is required');
      }
      const result = await this.productsService.deleteProductImage(parseInt(imageId));
      res.json(ResponseUtil.success(result, 'Image deleted successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to delete image'));
    }
  }

  async setPrimaryProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageId } = req.params;
      console.log('setPrimaryProductImage imageId----->', imageId);
      let data = {
        imageId: parseInt(imageId),
        isPrimary: req.body.isPrimary,
      };
      console.log('Request body:', {
        imageId: parseInt(imageId),
        isPrimary: req.body.isPrimary,
      });

      const result = await this.productsService.setPrimaryProductImage(data);
      res.json(ResponseUtil.success(result, 'Primary image updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to set primary image'),
      );
    }
  }

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

  // =================== STOCK AND INVENTORY MANAGEMENT ===================

  async getStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      const result = await this.productsService.getStock(variantId);
      res.json(ResponseUtil.success(result, 'Stock retrieved successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to retrieve stock'));
    }
  }

  async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      if (!req.body || typeof req.body.stock !== 'number') {
        throw new InvalidInputError('Stock value is required and must be a number');
      }
      const result = await this.productsService.updateStock(variantId, req.body.stock);
      res.json(ResponseUtil.success(result, 'Stock updated successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to update stock'));
    }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      if (!req.body || typeof req.body.adjustment !== 'number' || !req.body.reason) {
        throw new InvalidInputError('Adjustment value and reason are required');
      }
      const result = await this.productsService.adjustStock(variantId, req.body);
      res.json(ResponseUtil.success(result, 'Stock adjusted successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to adjust stock'));
    }
  }

  async getInventoryLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      const result = await this.productsService.getInventoryLogs(variantId);
      res.json(ResponseUtil.success(result, 'Inventory logs retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve inventory logs'),
      );
    }
  }

  async getStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      if (!variantId) {
        throw new InvalidInputError('Valid Variant ID is required');
      }
      const result = await this.productsService.getStockAlerts(variantId);
      res.json(ResponseUtil.success(result, 'Stock alerts retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve stock alerts'),
      );
    }
  }

  async resolveStockAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      if (!alertId || isNaN(parseInt(alertId))) {
        throw new InvalidInputError('Valid Alert ID is required');
      }
      const result = await this.productsService.resolveStockAlert(parseInt(alertId));
      res.json(ResponseUtil.success(result, 'Stock alert resolved successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to resolve stock alert'),
      );
    }
  }

  // =================== WISHLIST MANAGEMENT ===================

  async addToWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id, product_id } = req.body;
      if (!user_id || !product_id) {
        throw new InvalidInputError('user_id and product_id are required');
      }
      const result = await this.productsService.addToWishlist(user_id, product_id);
      res.json(ResponseUtil.success(result, 'Item added to wishlist successfully'));
    } catch (error: any) {
      next(
        error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
      );
    }
  }

  async clearWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.body;
      if (!user_id) {
        res.status(400).json({
          success: false,
          message: 'user_id is required',
        });
        return;
      }
      await this.productsService.clearWishlist(user_id);
      res.status(200).json({
        success: true,
        message: 'Wishlist cleared successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async removeFromWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { wishlist_id } = req.params;
      const { user_id } = req.body;
      if (!user_id) {
        throw new InvalidInputError('user_id and product_id are required');
      }
      await this.productsService.removeFromWishlist(wishlist_id, user_id);
      res.json(ResponseUtil.success({}, 'Item added to wishlist successfully'));
    } catch (error: any) {
      if (error.message === 'Wishlist item not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
      if (error.message === 'Unauthorized access') {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
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
      console.log('helllo------>getWishlistByUserId');
      const { userId } = req.params;
      console.log(userId);
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

  // =================== HELPER: MULTER ERROR HANDLER ===================

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
}
