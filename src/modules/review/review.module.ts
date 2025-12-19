import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { ReviewController } from './review.controller';
import { reviewRoutes } from './review.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class ReviewModule implements IModule {
  private controller: ReviewController;

  constructor() {
    this.controller = new ReviewController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('ReviewService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('ReviewModule initialized');
  }

  getRouter(): Router {
    return reviewRoutes(this.controller);
  }
}
