import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { OrdersController } from './orders.controller';
import { ordersRoutes } from './orders.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class OrdersModule implements IModule {
  private controller: OrdersController;

  constructor() {
    this.controller = new OrdersController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('OrdersService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('OrdersModule initialized');
  }

  getRouter(): Router {
    return ordersRoutes(this.controller);
  }
}
