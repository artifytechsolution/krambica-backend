import { ShippingMethod, OrderStatus, PaymentStatus, PaymentMethod } from '../../generated/prisma';

export interface Order {
  id: number;
  name: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  order_item_id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  quantity: number;
  price: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDTO {
  user_id: number;
  address_id: number;
  coupon_id?: number;
  items: Array<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }>;
  shippingMethod?: ShippingMethod;
  paymentMethod?: PaymentMethod;
}

export interface UpdateOrderDTO {
  address_id?: number;
  shippingMethod?: ShippingMethod;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface OrderWithDetails extends Order {
  items?: OrderItem[];
  user?: any;
  shippingAddress?: any;
  coupon?: any;
}

export interface OrderTrackingTimeline {
  status: OrderStatus;
  date: Date | null;
  completed: boolean;
  description: string;
}

export interface OrderTrackingInfo {
  order: OrderWithDetails;
  timeline: OrderTrackingTimeline[];
  currentStatus: OrderStatus;
  estimatedDelivery?: Date;
}

export interface PaginatedOrderResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters?: {
    applied: any;
    search?: string;
  };
}
