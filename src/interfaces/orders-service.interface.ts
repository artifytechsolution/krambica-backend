import { Order } from '../modules/orders/orders.types';

export interface IOrdersService {
  initialize(): Promise<void>;
  getAll(): Promise<Order[]>;
  getById(id: number | string): Promise<Order | undefined>;
  create(data: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  update(id: number, data: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order | undefined>;
  delete(id: number): Promise<boolean>;
}
