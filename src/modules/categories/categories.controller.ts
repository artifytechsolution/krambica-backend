import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { ICategoriesService } from '../../interfaces/categories-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';

export class CategoriesController {
  private categoriesService: ICategoriesService;
  private logger: ILoggerService;

  constructor() {
    this.categoriesService = DIContainer.resolve<ICategoriesService>('CategoriesService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.categoriesService.getAll();
      res.json(ResponseUtil.success(result, 'Categories list'));
    } catch (error: any) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.categoriesService.getById(req.params.id);
      res.json(ResponseUtil.success(item, 'Categorie found'));
    } catch (error: any) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.categoriesService.create(req.body);
      res.status(201).json(ResponseUtil.success(item, 'Categories created'));
    } catch (error: any) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.categoriesService.update(req.params.id, req.body);
      res.json(ResponseUtil.success(item, 'Categorie updated'));
    } catch (error: any) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.categoriesService.delete(req.params.id);
      res.json(ResponseUtil.success(null, 'Categorie deleted'));
    } catch (error: any) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
}
