import { User } from '../generated/prisma';

export interface IUserService {
  initialize(): Promise<void>;
  getAll(): Promise<User[]>;
  getById(id: number): Promise<User | undefined>;
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(id: number, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;
  delete(id: number): Promise<boolean>;
}
