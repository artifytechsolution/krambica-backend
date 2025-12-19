import { Review } from '../modules/review/review.types';

export interface IReviewService {
  initialize(): Promise<void>;
  getAll(): Promise<Review[]>;
  getById(id: number): Promise<Review | undefined>;
  create(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;
  update(id: number, data: Partial<Omit<Review, 'id' | 'createdAt'>>): Promise<Review | undefined>;
  delete(id: number): Promise<boolean>;
}
