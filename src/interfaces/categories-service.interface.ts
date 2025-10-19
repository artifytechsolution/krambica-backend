import { Categorie } from '../modules/categories/categories.types';

export interface ICategoriesService {
  initialize(): Promise<void>;
  getAll(): Promise<Categorie[]>;
  getById(id: string): Promise<Categorie | undefined>;
  create(data: Omit<Categorie, 'id' | 'createdAt'>): Promise<Categorie>;
  update(
    id: number,
    data: Partial<Omit<Categorie, 'id' | 'createdAt'>>,
  ): Promise<Categorie | undefined>;
  delete(id: number): Promise<boolean>;
}
