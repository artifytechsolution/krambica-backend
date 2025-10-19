import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class DatabaseController {
  private databaseService: IDatabaseService;
  private logger: ILoggerService;

  constructor() {
    this.databaseService =
      DIContainer.resolve<IDatabaseService>('DatabaseService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }
}
