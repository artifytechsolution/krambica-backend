// interfaces/promotions-service.interface.ts

import {
  Promotion,
  CreatePromotionDTO,
  UpdatePromotionDTO,
  ValidateCartRequest,
  PromotionValidationResult,
  AddEligibleProductDTO,
  AddFreeProductDTO,
  PromotionStatsResponse,
  CartItem,
  DiscountCalculation,
  FreeProductOption,
  UserPromotionHistoryItem,
} from '../modules/promotion/promotion.types';

export interface IPromotionsService {
  initialize(): Promise<void>;

  // Admin CRUD
  createPromotion(data: CreatePromotionDTO): Promise<Promotion>;
  getAllPromotions(queryParams?: any): Promise<any>;
  getPromotionById(id: string): Promise<Promotion>;
  updatePromotion(id: string, data: UpdatePromotionDTO): Promise<Promotion>;
  updatePromotionStatus(id: string, status: string): Promise<Promotion>;
  deletePromotion(id: string): Promise<boolean>;

  // Eligible Products Management
  addEligibleProducts(promotionId: string, data: AddEligibleProductDTO[]): Promise<any>;
  getEligibleProducts(promotionId: string, queryParams?: any): Promise<any>;
  removeEligibleProduct(promotionId: string, productId: number): Promise<boolean>;

  // Free Products Management
  addFreeProducts(promotionId: string, data: AddFreeProductDTO[]): Promise<any>;
  getFreeProducts(promotionId: string, queryParams?: any): Promise<any>;
  removeFreeProduct(promotionId: string, freeProductId: string): Promise<boolean>;

  // Customer-Facing
  validateCart(data: ValidateCartRequest): Promise<PromotionValidationResult[]>;
  getActivePromotions(): Promise<Promotion[]>;
  getAvailableFreeProducts(
    promotionId: string,
    cartItems: CartItem[],
  ): Promise<FreeProductOption[]>;
  calculateDiscount(promotionId: string, cartItems: CartItem[]): Promise<DiscountCalculation>;
  getPromotionsByProduct(productId: string): Promise<Promotion[]>;

  // Analytics
  getPromotionStats(promotionId: string): Promise<PromotionStatsResponse>;
  getPromotionReport(queryParams?: any): Promise<any>;

  // User Related
  checkUserEligibility(promotionId: string, userId: number): Promise<boolean>;
  getUserPromotionHistory(userId: string, queryParams?: any): Promise<any>;
}
