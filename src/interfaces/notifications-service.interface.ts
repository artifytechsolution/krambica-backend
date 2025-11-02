import { Notification } from '../modules/notifications/notifications.types';

export interface INotificationsService {
  initialize(): Promise<void>;
  getAll(): Promise<Notification[]>;
  getById(id: number): Promise<Notification | undefined>;
  create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  update(id: number, data: Partial<Omit<Notification, 'id' | 'createdAt'>>): Promise<Notification | undefined>;
  delete(id: number): Promise<boolean>;
}
