// promotions.controller.ts

import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IPromotionsService } from '../../interfaces/promotions-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class PromotionController {
  private promotionsService: IPromotionsService;
  private logger: ILoggerService;

  constructor() {
    this.promotionsService = DIContainer.resolve<IPromotionsService>('PromotionService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async createPromotion(req: Request, res: Response) {
    const promotion = await this.promotionsService.createPromotion(req.body);
    res.status(201).json(ResponseUtil.success(promotion, 'Promotion created successfully'));
  }

  async getAllPromotions(req: Request, res: Response) {
    const result = await this.promotionsService.getAllPromotions(req.query);
    res.json(ResponseUtil.success(result, 'Promotions retrieved successfully'));
  }

  async getPromotionById(req: Request, res: Response) {
    const promotion = await this.promotionsService.getPromotionById(req.params.id);
    res.json(ResponseUtil.success(promotion, 'Promotion found'));
  }

  async updatePromotion(req: Request, res: Response) {
    const promotion = await this.promotionsService.updatePromotion(req.params.id, req.body);
    res.json(ResponseUtil.success(promotion, 'Promotion updated successfully'));
  }

  async updatePromotionStatus(req: Request, res: Response) {
    const { status } = req.body;
    const promotion = await this.promotionsService.updatePromotionStatus(req.params.id, status);
    res.json(ResponseUtil.success(promotion, 'Promotion status updated successfully'));
  }

  async deletePromotion(req: Request, res: Response) {
    await this.promotionsService.deletePromotion(req.params.id);
    res.json(ResponseUtil.success(null, 'Promotion deleted successfully'));
  }

  async addEligibleProducts(req: Request, res: Response) {
    const eligibleProducts = await this.promotionsService.addEligibleProducts(
      req.params.id,
      req.body.products,
    );
    res
      .status(201)
      .json(ResponseUtil.success(eligibleProducts, 'Eligible products added successfully'));
  }

  async getEligibleProducts(req: Request, res: Response) {
    const result = await this.promotionsService.getEligibleProducts(req.params.id, req.query);
    res.json(ResponseUtil.success(result, 'Eligible products retrieved successfully'));
  }

  async removeEligibleProduct(req: Request, res: Response) {
    await this.promotionsService.removeEligibleProduct(
      req.params.id,
      parseInt(req.params.productId),
    );
    res.json(ResponseUtil.success(null, 'Eligible product removed successfully'));
  }

  async addFreeProducts(req: Request, res: Response) {
    const freeProducts = await this.promotionsService.addFreeProducts(
      req.params.id,
      req.body.products,
    );
    res.status(201).json(ResponseUtil.success(freeProducts, 'Free products added successfully'));
  }

  async getFreeProducts(req: Request, res: Response) {
    const result = await this.promotionsService.getFreeProducts(req.params.id, req.query);
    res.json(ResponseUtil.success(result, 'Free products retrieved successfully'));
  }

  async removeFreeProduct(req: Request, res: Response) {
    await this.promotionsService.removeFreeProduct(req.params.id, req.params.freeProductId);
    res.json(ResponseUtil.success(null, 'Free product removed successfully'));
  }

  async validateCart(req: Request, res: Response) {
    const validationResults = await this.promotionsService.validateCart(req.body);
    res.json(
      ResponseUtil.success(
        validationResults,
        validationResults.length > 0 ? 'Applicable promotions found' : 'No promotions applicable',
      ),
    );
  }

  async getActivePromotions(req: Request, res: Response) {
    const promotions = await this.promotionsService.getActivePromotions();
    res.json(ResponseUtil.success(promotions, 'Active promotions retrieved successfully'));
  }

  async getAvailableFreeProducts(req: Request, res: Response) {
    const freeProducts = await this.promotionsService.getAvailableFreeProducts(
      req.params.id,
      req.body.cartItems,
    );
    res.json(ResponseUtil.success(freeProducts, 'Available free products retrieved'));
  }

  async calculateDiscount(req: Request, res: Response) {
    const discount = await this.promotionsService.calculateDiscount(
      req.params.id,
      req.body.cartItems,
    );
    res.json(ResponseUtil.success(discount, 'Discount calculated successfully'));
  }

  async getPromotionsByProduct(req: Request, res: Response) {
    const promotions = await this.promotionsService.getPromotionsByProduct(req.params.productId);
    res.json(ResponseUtil.success(promotions, 'Product promotions retrieved successfully'));
  }

  async getPromotionStats(req: Request, res: Response) {
    const stats = await this.promotionsService.getPromotionStats(req.params.id);
    res.json(ResponseUtil.success(stats, 'Promotion statistics retrieved successfully'));
  }

  async getPromotionReport(req: Request, res: Response) {
    const report = await this.promotionsService.getPromotionReport(req.query);
    res.json(ResponseUtil.success(report, 'Promotion report generated successfully'));
  }

  async checkUserEligibility(req: Request, res: Response) {
    const userId = parseInt((req as any).user?.user_id || req.body.user_id);
    const isEligible = await this.promotionsService.checkUserEligibility(req.params.id, userId);
    res.json(
      ResponseUtil.success(
        { isEligible },
        isEligible ? 'User is eligible' : 'User is not eligible',
      ),
    );
  }

  async getUserPromotionHistory(req: Request, res: Response) {
    const userId = (req as any).user?.user_id || req.params.userId;
    const history = await this.promotionsService.getUserPromotionHistory(userId, req.query);
    res.json(ResponseUtil.success(history, 'User promotion history retrieved successfully'));
  }
}
