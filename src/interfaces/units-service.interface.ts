import { Unit } from '../modules/units/units.types';

export interface IUnitsService {
  initialize(): Promise<void>;
  getAll(): Promise<Unit[]>;
  getById(id: string): Promise<Unit | undefined>;
  create(data: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit>;
  update(id: number, data: Partial<Omit<Unit, 'id' | 'createdAt'>>): Promise<Unit | undefined>;
  delete(id: number): Promise<boolean>;
}
