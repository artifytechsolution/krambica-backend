import { injectable } from './di-container';
import { createLogger, format, transports } from 'winston';
import { IConfigService } from './config.service';
import { IEmailService } from '../interfaces/send-mail-service.interface';

export interface ILoggerService {
  info(message: string): void;
  error(message: string): void;
}

@injectable()
export class LoggerService implements ILoggerService {
  static dependencies = ['ConfigService', 'EmailService'];
  private logger: any;

  constructor(config: IConfigService, email: IEmailService) {
    this.logger = createLogger({
      level: config.get('LOG_LEVEL') || 'info',
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/app.log' }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
      ],
    });
    this.logger.info('LoggerService instantiated');
  }

  info(message: string) {
    this.logger.info(message);
  }

  error(message: string) {
    this.logger.error(message);
  }
}
