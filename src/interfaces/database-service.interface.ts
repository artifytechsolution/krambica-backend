import { PrismaClient } from '@prisma/client';
import { Database } from '../modules/database/database.types';

export interface IDatabaseService {
  client: PrismaClient;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  initialize(): Promise<void>;
}
