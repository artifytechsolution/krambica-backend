import {
  Order,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderStats,
  OrderWithDetails,
  OrderTrackingInfo,
  PaginatedOrderResponse,
} from '../modules/orders/orders.types';

export interface IOrdersService {
  getAll(queryParams: any): Promise<PaginatedOrderResponse>;
  getById(id: any): Promise<OrderWithDetails>;
  create(data: CreateOrderDTO): Promise<Order>;
  update(id: number, data: UpdateOrderDTO): Promise<Order>;
  delete(id: string): Promise<boolean>;

  confirmOrder(id: string): Promise<Order>;
  shipOrder(id: string, trackingNumber?: string, carrier?: string): Promise<Order>;
  deliverOrder(id: string): Promise<Order>;
  cancelOrder(id: string, reason?: string): Promise<boolean>;

  getActiveOrders(userId: number): Promise<Order[]>;
  trackOrder(userId: number, orderId: number): Promise<OrderTrackingInfo>;

  getOrderStats(dateFrom?: Date, dateTo?: Date): Promise<OrderStats>;
  getRevenueStats(dateFrom?: Date, dateTo?: Date, groupBy?: string): Promise<any[]>;
}
