import { User } from '../generated/prisma';
import { Auth, loginuserInput } from '../modules/auth/auth.types';

export interface IAuthService {
  initialize(): Promise<void>;
  getAll(): Promise<Auth[]>;
  getById(id: string): Promise<any | undefined>;
  create(data: Omit<Auth, 'id' | 'createdAt'>): Promise<Auth>;
  update(id: string, data: Partial<Omit<Auth, 'id' | 'createdAt'>>): Promise<Auth | undefined>;
  delete(id: string): Promise<boolean>;
  Login(data: loginuserInput): Promise<User>;
  RefreshToken(RefreshToken: string): any;
  sendOtp(email: string): any;
}
