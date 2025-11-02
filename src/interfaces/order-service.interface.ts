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
  delete(id: number): Promise<boolean>;

  confirmOrder(id: number): Promise<Order>;
  shipOrder(id: number, trackingNumber?: string, carrier?: string): Promise<Order>;
  deliverOrder(id: number): Promise<Order>;
  cancelOrder(id: number, reason?: string): Promise<boolean>;

  getActiveOrders(userId: number): Promise<Order[]>;
  trackOrder(userId: number, orderId: number): Promise<OrderTrackingInfo>;

  getOrderStats(dateFrom?: Date, dateTo?: Date): Promise<OrderStats>;
  getRevenueStats(dateFrom?: Date, dateTo?: Date, groupBy?: string): Promise<any[]>;
}
