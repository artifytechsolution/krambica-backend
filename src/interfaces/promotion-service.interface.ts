import { Promotion } from '../modules/promotion/promotion.types';

export interface IPromotionService {
  initialize(): Promise<void>;
  getAll(): Promise<Promotion[]>;
  getById(id: number): Promise<Promotion | undefined>;
  create(data: Omit<Promotion, 'id' | 'createdAt'>): Promise<Promotion>;
  update(id: number, data: Partial<Omit<Promotion, 'id' | 'createdAt'>>): Promise<Promotion | undefined>;
  delete(id: number): Promise<boolean>;
}
