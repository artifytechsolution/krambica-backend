import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { PaymentController } from './payment.controller';
import { paymentRoutes } from './payment.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class PaymentModule implements IModule {
  private controller: PaymentController;

  constructor() {
    this.controller = new PaymentController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('PaymentService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('PaymentModule initialized');
  }

  getRouter(): Router {
    return paymentRoutes(this.controller);
  }
}
