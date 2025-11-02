import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { NotificationsController } from './notifications.controller';
import { notificationsRoutes } from './notifications.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class NotificationsModule implements IModule {
  private controller: NotificationsController;

  constructor() {
    this.controller = new NotificationsController();
  }

  async initialize() {
    const service: any = DIContainer.resolve('NotificationsService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('NotificationsModule initialized');
  }

  getRouter(): Router {
    return notificationsRoutes(this.controller);
  }
}
