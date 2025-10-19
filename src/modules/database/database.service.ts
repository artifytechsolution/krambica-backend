import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { Database } from './database.types';
import { InvalidInputError } from '../../utils/error.utils';
import { PrismaClient } from '../../generated/prisma';

@injectable()
export class DatabaseService implements IService, IDatabaseService {
  static dependencies = ['LoggerService'];
  static optionalDependencies: string[] = [];
  public client: PrismaClient;
  private database: Database[] = [
    { id: 1, name: 'Sample Database 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Database 2', createdAt: new Date().toISOString() },
  ];
  private logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.client = new PrismaClient();
    this.logger = logger;
    this.logger.info('DatabaseService instantiated');
  }
  async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.info('Database connected successfully');
    } catch (error) {
      throw new InvalidInputError(
        `Failed to connect to database: ${(error as Error).message}`,
      );
    }
  }
  async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      throw new InvalidInputError(
        `Failed to disconnect from database: ${(error as Error).message}`,
      );
    }
  }

  async initialize() {
    this.logger.info('DatabaseService initialized with in-memory data');
  }
}
