import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { ICategoriesService } from '../../interfaces/categories-service.interface';
import { Categorie } from './categories.types';
import { InvalidInputError } from '../../utils/error.utils';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../../services/config.service';
import { PrismaOperationType, executePrismaOperation } from '../../utils/prisma.utils';
import cloudinary from '../../config/cloudinary.config';

@injectable()
export class CategoriesService implements IService, ICategoriesService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService'];
  static optionalDependencies: string[] = [];
  private categories: Categorie[] = [
    { id: 1, name: 'Sample Categorie 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Categorie 2', createdAt: new Date().toISOString() },
  ];
  private logger: ILoggerService;
  private db: DatabaseService;
  private config: ConfigService;

  constructor(logger: ILoggerService, db: DatabaseService, config: ConfigService) {
    this.logger = logger;
    this.logger.info('UnitsService instantiated');
    this.db = db;
    this.config = config;
  }
  uploadCategoryMedia(uploadData: any): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async initialize() {
    this.logger.info('CategoriesService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      return await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.READ,
        },
        this.db.client,
        this.logger,
      );
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(Id: string): Promise<any> {
    try {
      console.log('id is commingggg---------');
      console.log(Id);
      return await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: {
            id: Id,
          },
        },
        this.db.client,
        this.logger,
      );
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // async create(data: any): Promise<any> {
  //   try {
  //     const category = executePrismaOperation(
  //       'Category',
  //       {
  //         operation: PrismaOperationType.CREATE,
  //         data: {
  //           ...data,
  //         },
  //       },
  //       this.db.client,
  //       this.logger,
  //     );
  //     return category;
  //   } catch (error: any) {
  //     throw new InvalidInputError(error.message);
  //   }
  // }
  async create(data: any, files?: Express.Multer.File[]): Promise<any> {
    try {
      let imageUrl: string | null = null;

      // 1️⃣ Upload image (optional)
      if (files && files.length > 0) {
        const file = files[0]; // only ONE category image

        const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
          folder: 'category_images',
          public_id: `category_${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        });

        imageUrl = cloudinaryResult.secure_url;
      }

      // 2️⃣ Create category with image URL
      const category = await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            cat_img: imageUrl,
          },
        },
        this.db.client,
        this.logger,
      );

      return category;
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to create category');
    }
  }

  async update(id: string, data: any): Promise<any | undefined> {
    try {
      const updatedCategory = await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id },
          data: {
            ...data,
          },
        },
        this.db.client,
        this.logger,
      );
      return updatedCategory;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.DELETE,
          where: { id },
        },
        this.db.client,
        this.logger,
      );
      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }
  // async uploadCategoryMedia(uploadData: any) {
  //   const { id, files } = uploadData;

  //   console.log('category id', id);
  //   const category = await this.db.client.category.findUnique({
  //     where: { id: id },
  //   });
  //   console.log('review', category);
  //   if (!category) {
  //     throw new InvalidInputError(`category is not exist with id ${id}`);
  //   }

  //   if (!files || !files.length) {
  //     throw new InvalidInputError('No files uploaded');
  //   }

  //   const uploadedMedia = [];

  //   for (const file of files) {
  //     try {
  //       // 2️⃣ Upload to Cloudinary (auto detects type)
  //       const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
  //         folder: 'review_media',
  //         public_id: `review_${id}_${Date.now()}`,
  //         resource_type: 'auto',
  //         transformation: [
  //           { width: 1200, height: 1200, crop: 'limit' },
  //           { quality: 'auto' },
  //           { format: 'auto' },
  //         ],
  //       });

  //       // 3️⃣ Save record in DB
  //       const record = await this.db.client.category.update({
  //         where: { id: id },
  //         data: {
  //           cat_img: cloudinaryResult.secure_url,
  //         },
  //       });

  //       uploadedMedia.push(record);
  //     } catch (err) {
  //       console.error('Cloudinary upload failed:', err);
  //       throw new InvalidInputError('Media upload failed');
  //     }
  //   }

  //   return {
  //     success: true,
  //     message: 'Media uploaded successfully',
  //     data: uploadedMedia,
  //   };
  // }
}
