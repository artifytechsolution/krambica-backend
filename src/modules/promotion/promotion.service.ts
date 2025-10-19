import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IPromotionService } from '../../interfaces/promotion-service.interface';
import { Promotion } from './promotion.types';
import { InvalidInputError } from '../../utils/error.utils';

@injectable()
export class PromotionService implements IService, IPromotionService {
  static dependencies = ['LoggerService'];
  static optionalDependencies: string[] = [];
  private promotion: Promotion[] = [
    { id: 1, name: 'Sample Promotion 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Promotion 2', createdAt: new Date().toISOString() }
  ];
  private logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger;
    this.logger.info('PromotionService instantiated');
  }

  async initialize() {
    this.logger.info('PromotionService initialized with in-memory data');
  }

  async getAll(): Promise<Promotion[]> {
    return this.promotion;
  }

  async getById(id: number): Promise<Promotion | undefined> {
    if (id <= 0) throw new InvalidInputError('Invalid ID');
    const item = this.promotion.find(r => r.id === id);
    if (!item) throw new InvalidInputError('Promotion not found');
    return item;
  }

  async create(data: Omit<Promotion, 'id' | 'createdAt'>): Promise<Promotion> {
    const newItem: Promotion = {
      id: this.promotion.length > 0 ? Math.max(...this.promotion.map(r => r.id)) + 1 : 1,
      name: data.name,
      createdAt: new Date().toISOString()
    };
    this.promotion.push(newItem);
    return newItem;
  }

  async update(id: number, data: Partial<Omit<Promotion, 'id' | 'createdAt'>>): Promise<Promotion | undefined> {
    const item = this.promotion.find(r => r.id === id);
    if (!item) throw new InvalidInputError('Promotion not found');
    Object.assign(item, data);
    return item;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.promotion.findIndex(r => r.id === id);
    if (index === -1) throw new InvalidInputError('Promotion not found');
    this.promotion.splice(index, 1);
    return true;
  }
}
