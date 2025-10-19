import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { UnitsController } from './units.controller';
import { unitsRoutes } from './units.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';
import { UnitsService } from './units.service';

export class UnitsModule implements IModule {
  private controller: UnitsController;

  constructor() {
    this.controller = new UnitsController();
  }

  async initialize() {
    const service: UnitsService = DIContainer.resolve('UnitsService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('UnitsModule initialized');
  }

  getRouter(): Router {
    return unitsRoutes(this.controller);
  }
}
