import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { CuponController } from './cupon.controller';
import { cuponRoutes } from './cupon.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';
import { CuponService } from './cupon.service';

export class CuponModule implements IModule {
  private controller: CuponController;

  constructor() {
    this.controller = new CuponController();
  }

  async initialize() {
    const service: CuponService = DIContainer.resolve('CuponService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('cupon Module initialized');
  }

  getRouter(): Router {
    return cuponRoutes(this.controller);
  }
}
