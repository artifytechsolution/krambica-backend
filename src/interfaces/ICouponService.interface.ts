import { IService } from './service.interface';

export interface ICouponService extends IService {
  initialize(): Promise<void>;

  generateCouponCode(): Promise<string>;

  validateCouponBusinessLogic(
    coupon: any,
    orderValue: number,
    userId?: number | null,
  ): Promise<string[]>;

  calculateDiscount(coupon: any, orderValue: number): number;

  Create(data: any): Promise<any>;

  getById(id: number | string): Promise<any>;

  getByCode(code: string): Promise<any>;

  update(id: number | string, data: any): Promise<any>;

  delete(id: number | string): Promise<any>;

  validate(data: { code: string; orderValue: number; userId?: number }): Promise<{
    coupon: {
      id: number;
      code: string;
      type: string;
      value: number;
      description?: string;
    };
    discountAmount: number;
    finalAmount: number;
  }>;

  updateStatus(id: number | string, status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'): Promise<any>;

  getCouponStatistics(id: number | string): Promise<{
    coupon: {
      id: number;
      code: string;
      type: string;
      value: number;
    };
    statistics: {
      totalRedemptions: number;
      totalOrders: number;
      totalDiscount: number;
      totalOrderValue: number;
      averageOrderValue: number;
      usageRate: string | null;
      remainingUsage: number | null;
      redemptionsByDate: Record<string, number>;
    };
  }>;

  getUserCoupons(
    userId: number | string,
    query?: { status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' },
  ): Promise<{
    userId: number | string;
    redemptions: any[];
    summary: {
      totalRedemptions: number;
      totalSavings: number;
    };
  }>;

  redeem(data: { orderValue: number; userId: number; orderId: number; code: string }): Promise<{
    success: boolean;
    discountAmount: number;
    redemption: any;
  }>;

  revert(data: {
    code: string;
    redemptionId?: number;
    userId?: number;
    orderId?: number;
  }): Promise<string>;
}
