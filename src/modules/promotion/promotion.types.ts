// promotions.types.ts

export interface Promotion {
  promotion_id: number;
  name: string;
  description?: string;
  type: PromotionType;
  status: PromotionStatus;
  buyQuantity: number;
  getQuantity: number;
  priority: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  minPurchaseAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum PromotionType {
  BUY_X_GET_Y_FREE = 'BUY_X_GET_Y_FREE',
  QUANTITY_DISCOUNT = 'QUANTITY_DISCOUNT',
  BUNDLE_DEAL = 'BUNDLE_DEAL',
  TIERED_DISCOUNT = 'TIERED_DISCOUNT',
}

export enum PromotionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SCHEDULED = 'SCHEDULED',
  EXPIRED = 'EXPIRED',
}

export interface CartItem {
  product_id: number;
  product_size_var_id: number;
  quantity: number;
  price: number;
}

export interface ValidateCartRequest {
  items: CartItem[];
  user_id?: number;
}

export interface PromotionValidationResult {
  isEligible: boolean;
  promotion_id?: number;
  promotionName?: string;
  type?: PromotionType;
  discountAmount?: number;
  freeItemsEarned?: number;
  freeProducts?: any[];
  message?: string;
  details?: any;
}

export interface CreatePromotionDTO {
  name: string;
  description?: string;
  type: PromotionType;
  buyQuantity: number;
  getQuantity: number;
  priority?: number;
  validFrom: Date | string;
  validTo: Date | string;
  usageLimit?: number;
  perUserLimit?: number;
  minPurchaseAmount?: number;
}

export interface UpdatePromotionDTO {
  name?: string;
  description?: string;
  buyQuantity?: number;
  getQuantity?: number;
  priority?: number;
  validFrom?: Date | string;
  validTo?: Date | string;
  usageLimit?: number;
  perUserLimit?: number;
  minPurchaseAmount?: number;
}

export interface AddEligibleProductDTO {
  product_id?: number;
  category_id?: number;
}

export interface AddFreeProductDTO {
  product_id?: number;
  size_variant_id?: number;
  maxQuantity?: number;
  displayOrder?: number;
}

export interface PromotionStatsResponse {
  promotion_id: number;
  promotionName: string;
  totalRedemptions: number;
  totalRevenue: number;
  uniqueUsers: number;
  averageOrderValue: number;
  conversionRate: number;
  period: {
    validFrom: Date;
    validTo: Date;
  };
}

export interface DiscountCalculation {
  promotion_id: number;
  promotionName: string;
  type: PromotionType;
  cartTotal: number;
  discountAmount: number;
  finalAmount: number;
  savings: number;
  details: any;
}

// export interface FreeProductOption {
//   promotion_free_prod_id: number;
//   product_id?: number;
//   size_variant_id?: number;
//   productName: string;
//   colorName?: string;
//   size?: string;
//   price: number;
//   stock: number;
//   maxSelectableQuantity: number;
//   images: string[];
//   displayOrder: number;
// }
export interface FreeProductOption {
  promotion_free_prod_id: number;
  product_id: number;
  productName: string;
  basePrice: number;
  maxSelectableQuantity: number; // Max of THIS specific product
  totalFreeItemsEarned: number; // Total free items user can select
  displayOrder: number;
  availableVariants: Array<{
    product_size_var_id: number;
    size: string;
    price: number;
    stock: number;
    colorName: string;
    colorCode: string;
    colorId: number;
    images: string[];
  }>;
  primaryImage: string;
}

export interface UserPromotionHistoryItem {
  redemption_id: number;
  promotion: {
    id: number;
    name: string;
    type: PromotionType;
  };
  order: {
    id: number;
    total: number;
    placedAt: Date;
  };
  purchasedQuantity: number;
  freeQuantity: number;
  freeItems: any[];
  savingsAmount: number;
  appliedAt: Date;
}
