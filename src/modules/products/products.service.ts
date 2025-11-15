import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IProductsService } from '../../interfaces/products-service.interface';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { IConfigService } from '../../services/config.service';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { isUUID } from '../../utils/checkuuid';
import cloudinary from '../../config/cloudinary.config';
import fs from 'fs';
import { take } from 'lodash';
import { buildPrismaQuery, parseQueryParams } from '../../utils/prisma-query-builder';

@injectable()
export class ProductsService implements IService, IProductsService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService', 'AuthService'];
  static optionalDependencies: string[] = [];

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
  createproductvariant(data: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
  deleteProductVariant(id: string): Promise<any> {
    throw new Error('Method not implemented.');
  }
  async getProductVariantById(id: string | number): Promise<any> {
    const variant = await this.db.client.productSizeVariant.findMany({
      where: {
        id: id,
      },
    });
    console.log('variant is herere');
    console.log(variant);
    return variant;
  }

  async initialize() {
    this.logger.info('ProductsService initialized');
  }

  // =================== BASIC PRODUCT CRUD ===================

  // async getAll(): Promise<any> {
  //   try {
  //     const products = await executePrismaOperation<any>(
  //       'product',
  //       {
  //         operation: PrismaOperationType.READ,
  //         where: {
  //           deletedAt: null,
  //         },
  //         include: {
  //           reviews: true,
  //           category: true,
  //           colors: {
  //             include: {
  //               images: { where: { isPrimary: true }, take: 1 },
  //               sizeVariants: true,
  //             },
  //           },
  //           images: { where: { isPrimary: true } },
  //         },
  //       },
  //       this.db.client,
  //       this.logger,
  //     );
  //     return products;
  //   } catch (error: any) {
  //     throw new InvalidInputError(error.message);
  //   }
  // }
  async getAll(data?: any): Promise<any> {
    try {
      const allowedFields = {
        // ========== Direct Product Fields ==========
        id: 'uuid',
        product_id: 'int',
        name: 'string',
        slug: 'string',
        description: 'string',
        sku: 'string',
        basePrice: 'float',
        isVisible: 'boolean',
        isFeatured: 'boolean',
        category_id: 'int',
        gender: 'enum',
        material: 'string',
        fabric: 'string',
        careInstructions: 'string',
        createdAt: 'datetime',
        updatedAt: 'datetime',
        deletedAt: 'datetime',

        // ========== Category Relations ==========
        'category.id': 'uuid',
        'category.category_id': 'int',
        'category.name': 'string',
        'category.slug': 'string',
        'category.description': 'string',
      } as const;

      // Handle both body and query params format
      let filters = [];
      let page = 1;
      let limit = 10;
      let globalSearch = '';

      if (data) {
        if (data.filters && Array.isArray(data.filters)) {
          // Body format
          filters = data.filters;
          page = data.page || 1;
          limit = data.limit || 10;
          globalSearch = data.globalSearch || '';
        } else {
          // Query params format
          const parsed = parseQueryParams(data);
          filters = parsed.filters;
          page = parsed.page;
          limit = parsed.limit;
          globalSearch = parsed.globalSearch || '';
        }
      }

      const combineFieldsGroups = [
        ['colors.name', 'name'],
        ['category.name', 'name'],
      ];

      // Build dynamic filters
      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        allowedFields,
        page,
        limit,
        globalSearch,
        combineFieldsGroups,
      );

      // Merge with existing deletedAt filter
      const finalWhere = {
        ...where,
        deletedAt: null,
      };

      // Execute queries
      const [products, totalCount] = await Promise.all([
        this.db.client.product.findMany({
          where: finalWhere,
          orderBy: orderBy.length > 0 ? orderBy : undefined,
          skip,
          take,
          include: {
            reviews: true,
            category: true,
            colors: {
              take: 1, // only fetch the first color
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 2, // fetch image + video if available
                },
                sizeVariants: true,
              },
            },
            images: {
              where: { isPrimary: true },
            },
          },
        }),
        this.db.client.product.count({ where: finalWhere }),
      ]);

      // Return with pagination metadata
      const totalPages = Math.ceil(totalCount / take);

      return {
        success: true,
        data: products,
        pagination: {
          total: totalCount,
          page,
          limit: take,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
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
      const product = await this.db.client.product.findUnique({
        where,
        include: {
          reviews: true,
          category: true,
          colors: {
            include: {
              images: true,
              sizeVariants: true,
            },
          },
          images: {
            where: { isPrimary: true },
          },
        },
      });

      return product;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: any): Promise<any> {
    try {
      const { category_id, ...maindata } = data;

      const category = await this.db.client.category.findUnique({
        where: {
          id: data.category_id,
        },
      });
      console.log('category finally found---');
      console.log(category.category_id);
      if (!category) {
        throw new InvalidInputError('Category does not exist');
      }
      const result = { maindata };
      console.log('main object is commingg');
      console.log(result);
      const product = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.CREATE,
          data: { category_id: category.category_id, ...maindata },
        },
        this.db.client,
        this.logger,
      );
      console.log('product created---');
      console.log(product);
      return product;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(id: string, data: any): Promise<any> {
    try {
      const productExists = await executePrismaOperation<any>(
        'product',
        {
          operation: PrismaOperationType.READ_FIRST,
          where: { id },
        },
        this.db.client,
        this.logger,
      );
      if (!productExists) {
        throw new InvalidInputError('Product does not exist');
      }
      const product = await executePrismaOperation(
        'product',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: productExists.data.id },
          data,
        },
        this.db.client,
        this.logger,
      );
      return product;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete: mark as deleted instead of removing
      const findprouct = await this.db.client.product.findUnique({
        where: { id },
      });
      if (!findprouct) {
        throw new InvalidInputError('Product does not exist');
      }
      await this.db.client.product.update({
        where: { product_id: findprouct.product_id },
        data: { deletedAt: new Date() },
      });

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // =================== PRODUCT COLOR MANAGEMENT ===================

  async getAllColorsByProduct(productId: string): Promise<any> {
    try {
      const product: any = await this.getById(productId);
      console.log('product.data.product_id is here');
      console.log(product);
      if (!product) {
        throw new InvalidInputError('Product does not exist');
      }

      const colors = await this.db.client.productColor.findMany({
        where: { product_id: product.data.product_id },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          sizeVariants: true,
        },
      });
      return { success: true, data: colors, count: colors.length };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async createColor(data: any): Promise<any> {
    try {
      const product: any = await this.getById(data.product_id);
      console.log('product.data.product_id is here');
      console.log(product);
      if (!product) {
        throw new InvalidInputError('Product does not exist');
      }
      const color = await this.db.client.productColor.create({
        data: {
          product_id: product.product_id,
          color_name: data.color_name,
          color_code: data.color_code,
          isAvailable: data.isAvailable ?? true,
          displayOrder: data.displayOrder ?? 0,
        },
      });
      return { success: true, data: color };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async updateColor(colorId: string, data: any): Promise<any> {
    try {
      const productcolur: any = await this.db.client.ProductColor.findUnique({
        where: {
          id: colorId,
        },
      });

      if (!productcolur) {
        throw new InvalidInputError('Product does not exist');
      }
      const color = await this.db.client.productColor.update({
        where: { product_color_id: productcolur.product_color_id },
        data: { ...data, updatedAt: new Date() },
      });
      return { success: true, data: color };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async deleteColor(colorId: string): Promise<boolean> {
    try {
      const productcolur: any = await this.db.client.ProductColor.findUnique({
        where: {
          id: colorId,
        },
      });

      if (!productcolur) {
        throw new InvalidInputError('Product does not exist');
      }
      await this.db.client.productColor.delete({
        where: { product_color_id: productcolur.product_color_id },
      });
      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // =================== PRODUCT COLOR IMAGES ===================

  async getColorImages(colorId: string): Promise<any> {
    try {
      const productcolur: any = await this.db.client.ProductColor.findUnique({
        where: {
          id: colorId,
        },
      });

      if (!productcolur) {
        throw new InvalidInputError('Product does not exist');
      }
      const images = await this.db.client.productColorImage.findMany({
        where: { product_color_id: productcolur.product_color_id },
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      });
      return { success: true, data: images, count: images.length };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // async uploadMultipleColorImages(uploadData: {
  //   product_color_id: string;
  //   files: Express.Multer.File[];
  // }): Promise<any> {
  //   const { files, product_color_id } = uploadData;

  //   console.log('Starting batch upload for color:', product_color_id);
  //   console.log(`Total files to upload: ${files.length}`);

  //   // Verify color exists first
  //   const color = await this.db.client.productColor.findUnique({
  //     where: { id: product_color_id },
  //   });

  //   console.log('Color found:', color);

  //   if (!color) {
  //     throw new InvalidInputError('Product color not found');
  //   }

  //   const results: any[] = [];
  //   const errors: any[] = [];

  //   // Process files sequentially to avoid overwhelming Cloudinary
  //   for (let i = 0; i < files.length; i++) {
  //     const file = files[i];
  //     try {
  //       console.log(`\n🔄 Processing file ${i + 1}/${files.length}: ${file.originalname}`);

  //       // Upload to Cloudinary
  //       const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
  //         folder: 'products/colors',
  //         public_id: `color_${color.product_color_id}_${Date.now()}_${i}`,
  //         transformation: [
  //           { width: 1000, height: 1000, crop: 'limit' },
  //           { quality: 'auto' },
  //           { format: 'auto' },
  //         ],
  //         resource_type: 'auto',
  //       });

  //       console.log(`☁️ Cloudinary upload successful for file ${i + 1}`);
  //       console.log(`   URL: ${cloudinaryResult.secure_url}`);

  //       // Save to database
  //       const colorImage = await this.db.client.productColorImage.create({
  //         data: {
  //           product_color_id: color.product_color_id,
  //           url: cloudinaryResult.secure_url,
  //           altText: file.originalname,
  //           isPrimary: i === 0, // First image is primary
  //           displayOrder: i,
  //         },
  //       });

  //       // Clean up local file
  //       await this.cleanupLocalFile(file.path);

  //       results.push(colorImage);
  //       console.log(`✅ File ${i + 1}/${files.length} completed successfully`);
  //     } catch (error) {
  //       console.error(`❌ File ${i + 1}/${files.length} failed: ${file.originalname}`, error);

  //       // Clean up local file even on error
  //       await this.cleanupLocalFile(file.path);

  //       errors.push({
  //         filename: file.originalname,
  //         error: error instanceof Error ? error.message : 'Unknown error',
  //       });
  //     }
  //   }

  //   console.log(`\n📊 Batch upload summary:`);
  //   console.log(`   Total files: ${files.length}`);
  //   console.log(`   Successful: ${results.length}`);
  //   console.log(`   Failed: ${errors.length}`);

  //   return {
  //     success: results.length > 0,
  //     data: results,
  //     errors: errors,
  //     summary: {
  //       total: files.length,
  //       uploaded: results.length,
  //       failed: errors.length,
  //     },
  //   };
  // }

  async uploadMultipleColorImages(uploadData: {
    product_color_id: string;
    files: Express.Multer.File[];
  }): Promise<any> {
    const { files, product_color_id } = uploadData;

    console.log('Starting batch upload for color:', product_color_id);
    console.log(`Total files to upload: ${files.length}`);

    // Verify color exists first
    const color = await this.db.client.productColor.findUnique({
      where: { id: product_color_id },
    });

    console.log('Color found:', color);

    if (!color) {
      throw new InvalidInputError('Product color not found');
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Process files sequentially to avoid overwhelming Cloudinary
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`\n🔄 Processing file ${i + 1}/${files.length}: ${file.originalname}`);

        // Detect if file is video
        const isVideo = file.mimetype.startsWith('video/');

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
          folder: 'products/colors',
          public_id: `color_${color.product_color_id}_${Date.now()}_${i}`,
          transformation: isVideo
            ? [{ width: 1280, height: 720, crop: 'limit' }, { quality: 'auto' }]
            : [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto' },
                { format: 'auto' },
              ],
          resource_type: 'auto',
        });

        console.log(`☁️ Cloudinary upload successful for file ${i + 1}`);
        console.log(`   URL: ${cloudinaryResult.secure_url}`);

        // Save to database
        const colorImage = await this.db.client.productColorImage.create({
          data: {
            product_color_id: color.product_color_id,
            url: cloudinaryResult.secure_url,
            altText: file.originalname,
            type: isVideo ? 'video' : 'image',
            isPrimary: i === 0, // First image is primary
            displayOrder: i,
          },
        });

        // Clean up local file
        await this.cleanupLocalFile(file.path);

        results.push(colorImage);
        console.log(`✅ File ${i + 1}/${files.length} completed successfully`);
      } catch (error) {
        console.error(`❌ File ${i + 1}/${files.length} failed: ${file.originalname}`, error);

        // Clean up local file even on error
        await this.cleanupLocalFile(file.path);

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

  //here not upadte image
  async updateColorImage(imageId: number, updateData: any): Promise<any> {
    console.log('image id is ghererere----->');
    console.log(imageId);
    try {
      const image = await this.db.client.productColorImage.update({
        where: { id: imageId },
        data: { ...updateData, updatedAt: new Date() },
      });
      return { success: true, data: image };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async deleteColorImage(imageId: number): Promise<boolean> {
    try {
      const image = await this.db.client.productColorImage.findUnique({
        where: { id: imageId },
      });
      if (!image) {
        throw new InvalidInputError('Image not found');
      }

      const publicId = this.extractPublicIdFromUrl(image.url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      await this.db.client.productColorImage.delete({
        where: { id: imageId },
      });
      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // =================== PRODUCT SIZE VARIANTS ===================

  async getSizeVariantsByColor(colorId: string): Promise<any> {
    try {
      const isAvailable = await this.db.client.ProductColor.findUnique({
        where: {
          id: colorId,
        },
      });
      const variants = await this.db.client.productSizeVariant.findMany({
        where: { product_color_id: isAvailable.product_color_id },
        orderBy: { size: 'asc' },
      });
      return { success: true, data: variants, count: variants.length };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async createSizeVariant(data: any): Promise<any> {
    try {
      console.log('data is here----->');
      console.log(data);
      const color: any = await this.db.client.productColor.findUnique({
        where: { id: data.product_color_id },
      });
      console.log('color is commingggg----->');
      console.log(typeof color.product_color_id);
      if (!color) {
        throw new InvalidInputError('Product color does not exist');
      }

      const variant = await this.db.client.productSizeVariant.create({
        data: {
          product_color_id: color.product_color_id,
          size: data.size,
          sku: data.sku,
          price: data.price,
          stock: data.stock || 0,
          availableStock: data.stock || 0,
          lowStockThreshold: data.lowStockThreshold || 5,
          isAvailable: data.isAvailable ?? true,
        },
      });

      // Update color total stock
      await this.updateColorTotalStock(color.product_color_id);

      return { success: true, data: variant };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async updateSizeVariant(variantId: string, data: any): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.update({
        where: { id: variantId },
        data: { ...data, updatedAt: new Date() },
      });

      // Update color total stock if stock changed
      if (data.stock !== undefined) {
        const variantData = await this.db.client.productSizeVariant.findUnique({
          where: { id: variantId },
        });
        if (variantData) {
          await this.updateColorTotalStock(variantData.product_color_id);
        }
      }

      return { success: true, data: variant };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async deleteSizeVariant(variantId: string): Promise<boolean> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }

      await this.db.client.productSizeVariant.delete({
        where: { id: variantId },
      });

      // Update color total stock
      await this.updateColorTotalStock(variant.product_color_id);

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // =================== PRODUCT IMAGES (General) ===================

  async uploadSingleImage(uploadData: {
    product_id: number;
    altText?: string;
    isPrimary?: boolean;
    file: Express.Multer.File;
  }) {
    try {
      const { file, ...data } = uploadData;

      const product = await this.db.client.product.findUnique({
        where: { id: data.product_id },
      });
      if (!product) {
        throw new InvalidInputError('Product not found');
      }

      const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
        folder: 'products',
        public_id: `product_${product.product_id}_${Date.now()}`,
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' },
        ],
        resource_type: 'image',
      });

      const productImage = await this.db.client.productImage.create({
        data: {
          product_id: product.product_id,
          url: cloudinaryResult.secure_url,
          altText: data.altText || file.originalname,
          isPrimary: data.isPrimary || false,
        },
      });

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
      await this.cleanupLocalFile(uploadData.file.path);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMultipleImages(uploadData: { product_id: number; files: Express.Multer.File[] }) {
    const { files, product_id } = uploadData;
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.uploadSingleImage({
          product_id,
          altText: file.originalname,
          isPrimary: i === 0,
          file,
        });
        results.push(result.data);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: results.length > 0,
      data: results,
      errors,
      summary: {
        total: files.length,
        uploaded: results.length,
        failed: errors.length,
      },
    };
  }

  async getProductImages(product_id: string) {
    try {
      const exist = await this.getById(product_id);
      const images = await this.db.client.productImage.findMany({
        where: { product_id: exist.data.product_id },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return { success: true, data: images, count: images.length };
    } catch (error) {
      throw new Error('Failed to fetch product images');
    }
  }

  async deleteProductImage(imageId: number) {
    try {
      const image = await this.db.client.productImage.findUnique({
        where: { id: imageId },
      });
      if (!image) {
        throw new Error('Image not found in database');
      }

      const publicId = this.extractPublicIdFromUrl(image.url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      await this.db.client.productImage.delete({
        where: { id: imageId },
      });

      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      throw new Error(
        `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async setPrimaryProductImage(imageId: number) {
    try {
      const image = await this.db.client.productImage.findUnique({
        where: { id: imageId },
      });
      if (!image) {
        throw new Error('Image not found in database');
      }

      await this.db.client.$transaction(async (tx: any) => {
        await tx.productImage.updateMany({
          where: { product_id: image.product_id },
          data: { isPrimary: false },
        });
        await tx.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        });
      });

      return { success: true, message: 'Primary image updated successfully' };
    } catch (error) {
      throw new Error('Failed to set primary image');
    }
  }

  async updateProductImage(imageId: number, updateData: any) {
    try {
      const image = await this.db.client.productImage.update({
        where: { id: imageId },
        data: { ...updateData, updatedAt: new Date() },
      });
      return { success: true, data: image, message: 'Image updated successfully' };
    } catch (error) {
      throw new Error('Failed to update image');
    }
  }

  // =================== STOCK AND INVENTORY MANAGEMENT ===================

  async getStock(variantId: string): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
        select: {
          stock: true,
          reservedStock: true,
          availableStock: true,
          isLowStock: true,
          lowStockThreshold: true,
        },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }
      return { success: true, data: variant };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async updateStock(variantId: string, newStock: number): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }

      const updatedVariant = await this.db.client.productSizeVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
          availableStock: newStock - variant.reservedStock,
          isLowStock: newStock <= variant.lowStockThreshold,
        },
      });

      // Log the stock change
      await this.db.client.sizeVariantInventoryLog.create({
        data: {
          product_size_var_id: variant.product_size_var_id,
          changeType: 'MANUAL_ADJUSTMENT',
          quantityChanged: newStock - variant.stock,
          stockBeforeChange: variant.stock,
          stockAfterChange: newStock,
          reservedStockBefore: variant.reservedStock,
          reservedStockAfter: variant.reservedStock,
          referenceType: 'MANUAL',
          referenceId: `STOCK_UPDATE_${Date.now()}`,
          remarks: 'Manual stock update',
        },
      });

      // Update color total stock
      await this.updateColorTotalStock(variant.product_color_id);

      return { success: true, data: updatedVariant };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async adjustStock(variantId: string, adjustmentData: any): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }

      const newStock = variant.stock + adjustmentData.adjustment;
      const updatedVariant = await this.db.client.productSizeVariant.update({
        where: { product_size_var_id: variant.product_size_var_id },
        data: {
          stock: newStock,
          availableStock: newStock - variant.reservedStock,
          isLowStock: newStock <= variant.lowStockThreshold,
        },
      });

      // Log the adjustment
      await this.db.client.sizeVariantInventoryLog.create({
        data: {
          product_size_var_id: variant.product_size_var_id,
          changeType: adjustmentData.adjustment > 0 ? 'INCREASE' : 'DECREASE',
          quantityChanged: adjustmentData.adjustment,
          stockBeforeChange: variant.stock,
          stockAfterChange: newStock,
          reservedStockBefore: variant.reservedStock,
          reservedStockAfter: variant.reservedStock,
          referenceType: 'ADJUSTMENT',
          referenceId: `ADJ_${Date.now()}`,
          remarks: adjustmentData.reason || 'Stock adjustment',
        },
      });

      await this.updateColorTotalStock(variant.product_color_id);

      return { success: true, data: updatedVariant };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getInventoryLogs(variantId: string): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }
      const logs = await this.db.client.sizeVariantInventoryLog.findMany({
        where: { product_size_var_id: variant.product_size_var_id },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
      return { success: true, data: logs, count: logs.length };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getStockAlerts(variantId: string): Promise<any> {
    try {
      const variant = await this.db.client.productSizeVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new InvalidInputError('Size variant not found');
      }
      const alerts = await this.db.client.stockAlert.findMany({
        where: { product_size_var_id: variant.product_size_var_id, isResolved: false },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: alerts, count: alerts.length };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async resolveStockAlert(alertId: number): Promise<any> {
    try {
      const alert = await this.db.client.stockAlert.update({
        where: { stock_alert_id: alertId },
        data: { isResolved: true, resolvedAt: new Date() },
      });
      return { success: true, data: alert };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // =================== WISHLIST MANAGEMENT ===================

  async addToWishlist(userId: any, productId: any) {
    try {
      const product = await this.db.client.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new InvalidInputError('Product not found');
      }

      const user = await this.db.client.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new InvalidInputError('User not found');
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
        include: { product: true },
      });

      return { success: true, data: wishlistItem };
    } catch (error) {
      throw error;
    }
  }

  async removeFromWishlist(wishlistId: any, userId: any) {
    try {
      const existingItem = await this.db.client.wishlist.findUnique({
        where: { uuid: wishlistId },
      });

      if (!existingItem) {
        throw new Error('Wishlist item not found');
      }

      const user = await this.db.client.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new Error('user is not found');
      }

      if (existingItem.user_id !== user.user_id) {
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
      const user = await this.db.client.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new InvalidInputError('user not found');
      }
      const wishlistItems = await this.db.client.wishlist.findMany({
        where: { user_id: user.user_id },
        include: {
          product: {
            include: {
              reviews: true,
              category: true,
              colors: {
                take: 1, // only fetch the first color
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 2, // fetch image + video if available
                  },
                  sizeVariants: true,
                },
              },
              images: {
                where: { isPrimary: true },
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

  // =================== HELPER METHODS ===================

  private async updateColorTotalStock(colorId: number): Promise<void> {
    const variants = await this.db.client.productSizeVariant.findMany({
      where: { product_color_id: colorId },
    });
    const totalStock = variants.reduce((sum: any, v: any) => sum + v.stock, 0);
    await this.db.client.productColor.update({
      where: { product_color_id: colorId },
      data: { totalStock },
    });
  }

  private async cleanupLocalFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.info(`Local file cleaned up: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup local file: ${filePath}`);
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
        return pathAfterUpload.replace(/\.[^/.]+$/, '');
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
