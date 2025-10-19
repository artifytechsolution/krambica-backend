import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { AuthController } from './auth.controller';
import { authRoutes } from './auth.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';
import { AuthService } from './auth.service';

export class AuthModule implements IModule {
  private controller: AuthController;

  constructor() {
    this.controller = new AuthController();
  }

  async initialize() {
    const service: AuthService = DIContainer.resolve('AuthService');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('AuthModule initialized');
  }

  getRouter(): Router {
    return authRoutes(this.controller);
  }
}
