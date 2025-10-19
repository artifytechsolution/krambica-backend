import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { ICategoriesService } from '../../interfaces/categories-service.interface';
import { Categorie } from './categories.types';
import { InvalidInputError } from '../../utils/error.utils';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../../services/config.service';
import { PrismaOperationType, executePrismaOperation } from '../../utils/prisma.utils';

@injectable()
export class CategoriesService implements IService, ICategoriesService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService'];
  static optionalDependencies: string[] = [];
  private categories: Categorie[] = [
    { id: 1, name: 'Sample Categorie 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Categorie 2', createdAt: new Date().toISOString() },
  ];
  private logger: ILoggerService;
  private db: DatabaseService;
  private config: ConfigService;

  constructor(logger: ILoggerService, db: DatabaseService, config: ConfigService) {
    this.logger = logger;
    this.logger.info('UnitsService instantiated');
    this.db = db;
    this.config = config;
  }

  async initialize() {
    this.logger.info('CategoriesService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      return await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.READ,
        },
        this.db.client,
        this.logger,
      );
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(Id: string): Promise<any> {
    try {
      console.log('id is commingggg---------');
      console.log(Id);
      return await executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: {
            id: Id,
          },
        },
        this.db.client,
        this.logger,
      );
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: any): Promise<any> {
    try {
      const category = executePrismaOperation(
        'Category',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...data,
          },
        },
        this.db.client,
        this.logger,
      );
      return category;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(
    id: number,
    data: Partial<Omit<Categorie, 'id' | 'createdAt'>>,
  ): Promise<Categorie | undefined> {
    const item = this.categories.find((r) => r.id === id);
    if (!item) throw new InvalidInputError('Categorie not found');
    Object.assign(item, data);
    return item;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.categories.findIndex((r) => r.id === id);
    if (index === -1) throw new InvalidInputError('Categorie not found');
    this.categories.splice(index, 1);
    return true;
  }
}
