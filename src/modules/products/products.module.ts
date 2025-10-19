import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { ProductsController } from './products.controller';
import { productsRoutes } from './products.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class ProductsModule implements IModule {
  private controller: ProductsController;

  constructor() {
    this.controller = new ProductsController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('ProductsService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('ProductsModule initialized');
  }

  getRouter(): Router {
    return productsRoutes(this.controller);
  }
}
