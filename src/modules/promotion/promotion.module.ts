import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { PromotionController } from './promotion.controller';
import { promotionRoutes } from './promotion.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class PromotionModule implements IModule {
  private controller: PromotionController;

  constructor() {
    this.controller = new PromotionController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('PromotionService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('PromotionModule initialized');
  }

  getRouter(): Router {
    return promotionRoutes(this.controller);
  }
}
