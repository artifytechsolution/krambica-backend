import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { DatabaseController } from './database.controller';
import { databaseRoutes } from './database.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';
import { DatabaseService } from './database.service';

export class DatabaseModule implements IModule {
  private controller: DatabaseController;

  constructor() {
    this.controller = new DatabaseController();
  }

  async initialize() {
    const service: DatabaseService = DIContainer.resolve('DatabaseService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('DatabaseModule initialized');
  }

  getRouter(): Router {
    return databaseRoutes(this.controller);
  }
}
