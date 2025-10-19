import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { CategoriesController } from './categories.controller';
import { categoriesRoutes } from './categories.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class CategoriesModule implements IModule {
  private controller: CategoriesController;

  constructor() {
    this.controller = new CategoriesController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('CategoriesService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('CategoriesModule initialized');
  }

  getRouter(): Router {
    return categoriesRoutes(this.controller);
  }
}
