import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IUnitsService } from '../../interfaces/units-service.interface';
import { Unit } from './units.types';
import { InvalidInputError } from '../../utils/error.utils';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../../services/config.service';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';

@injectable()
export class UnitsService implements IService, IUnitsService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService'];
  static optionalDependencies: string[] = [];
  private units: Unit[] = [
    { id: 1, name: 'Sample Unit 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Unit 2', createdAt: new Date().toISOString() },
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
    this.logger.info('UnitsService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      console.log('api is callled start-----------');
      const isExist = await executePrismaOperation<any>(
        'unit',
        {
          operation: PrismaOperationType.READ,
        },
        this.db.client,
        this.logger,
      );
      return isExist;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(id: string): Promise<any> {
    try {
      const unit = await executePrismaOperation<any>(
        'unit',
        {
          operation: PrismaOperationType.READ,
          where: {
            id: parseInt(id),
          },
        },
        this.db.client,
        this.logger,
      );
      if (!unit) {
        throw new InvalidInputError(`unit is not exist`);
      }
      return unit;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: any): Promise<any> {
    try {
      const isExist = await executePrismaOperation<any>(
        'unit',
        {
          operation: PrismaOperationType.READ,
          where: {
            name: data.unitType,
          },
        },
        this.db.client,
        this.logger,
      );
      if (isExist.data.length > 0) {
        throw new InvalidInputError(`${data.unitType} is already exist`);
      }
      await executePrismaOperation<any>(
        'unit',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            name: data.unitType,
            short: data.short,
          },
        },
        this.db.client,
        this.logger,
      );
      return 'unit created sucessfully';
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(
    id: number,
    data: Partial<Omit<Unit, 'id' | 'createdAt'>>,
  ): Promise<Unit | undefined> {
    const item = this.units.find((r) => r.id === id);
    if (!item) throw new InvalidInputError('Unit not found');
    Object.assign(item, data);
    return item;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.units.findIndex((r) => r.id === id);
    if (index === -1) throw new InvalidInputError('Unit not found');
    this.units.splice(index, 1);
    return true;
  }
}
