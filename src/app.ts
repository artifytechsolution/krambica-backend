import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { readdirSync } from 'fs';
import { join } from 'path';
import { IModule } from './interfaces/module.interface';
import { DIContainer } from './services/di-container';
import { errorMiddleware } from './middleware/error.middleware';
import { IConfigService } from './services/config.service';
import { ILoggerService } from './services/logger.service';

export class App {
  private app: Application;
  private config: IConfigService;
  private logger: ILoggerService;

  constructor() {
    this.app = express();
    this.config = DIContainer.resolve<IConfigService>('ConfigService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async initialize() {
    try {
      this.setupMiddleware();
      await this.registerModules();
      this.setupErrorHandling();
      this.setupHealthCheck();
      this.logger.info('Application initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize application: ${(error as Error).message}`);
      throw error;
    }
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(
      rateLimit({
        windowMs: this.config.getNumber('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000,
        max: this.config.getNumber('RATE_LIMIT_MAX') || 100,
      }),
    );
    this.logger.info('Middleware configured');
  }

  private async registerModules() {
    const modulesDir = join(__dirname, 'modules');
    const moduleFolders = readdirSync(modulesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    const failedModules: string[] = [];
    for (const folder of moduleFolders) {
      try {
        const modulePath = join(modulesDir, folder, `${folder}.module`);
        const ModuleClass =
          require(modulePath)[`${folder.charAt(0).toUpperCase() + folder.slice(1)}Module`];
        const moduleInstance: IModule = new ModuleClass();
        await moduleInstance.initialize();
        this.app.use(`/api/${folder}`, moduleInstance.getRouter());
        this.logger.info(`Registered module: ${folder}`);
      } catch (error) {
        this.logger.error(`Failed to register module ${folder}: ${(error as Error).message}`);
        failedModules.push(folder);
      }
    }

    if (failedModules.length > 0) {
      throw new Error(`Failed to register modules: ${failedModules.join(', ')}`);
    }
  }

  private setupErrorHandling() {
    //@ts-ignore
    this.app.use(errorMiddleware);
    this.logger.info('Error handling configured');
  }

  private setupHealthCheck() {
    this.app.get('/health', (req, res) => {
      this.logger.info('Health check requested');
      res.status(200).json({ status: 'OK' });
    });
  }

  getApp(): Application {
    return this.app;
  }
}
