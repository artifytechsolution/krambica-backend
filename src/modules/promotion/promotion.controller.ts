// promotions.controller.ts

import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IPromotionsService } from '../../interfaces/promotions-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';

export class PromotionController {
  private promotionsService: IPromotionsService;
  private logger: ILoggerService;

  constructor() {
    this.promotionsService = DIContainer.resolve<IPromotionsService>('PromotionService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async createPromotion(req: Request, res: Response, next: NextFunction) {
    try {
      const promotion = await this.promotionsService.createPromotion(req.body);
      res.status(201).json(ResponseUtil.success(promotion, 'Promotion created successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to create promotion'));
    }
  }

  async getAllPromotions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.promotionsService.getAllPromotions(req.query);
      res.json(ResponseUtil.success(result, 'Promotions retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to retrieve promotions'),
      );
    }
  }

  async getPromotionById(req: Request, res: Response, next: NextFunction) {
    try {
      const promotion = await this.promotionsService.getPromotionById(req.params.id);
      res.json(ResponseUtil.success(promotion, 'Promotion found'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to retrieve promotion'),
      );
    }
  }

  async updatePromotion(req: Request, res: Response, next: NextFunction) {
    try {
      const promotion = await this.promotionsService.updatePromotion(req.params.id, req.body);
      res.json(ResponseUtil.success(promotion, 'Promotion updated successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to update promotion'));
    }
  }

  async updatePromotionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const promotion = await this.promotionsService.updatePromotionStatus(req.params.id, status);
      res.json(ResponseUtil.success(promotion, 'Promotion status updated successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to update promotion status'),
      );
    }
  }

  async deletePromotion(req: Request, res: Response, next: NextFunction) {
    try {
      await this.promotionsService.deletePromotion(req.params.id);
      res.json(ResponseUtil.success(null, 'Promotion deleted successfully'));
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to delete promotion'));
    }
  }

  async addEligibleProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const eligibleProducts = await this.promotionsService.addEligibleProducts(
        req.params.id,
        req.body.products,
      );
      res
        .status(201)
        .json(ResponseUtil.success(eligibleProducts, 'Eligible products added successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to add eligible products'),
      );
    }
  }

  async getEligibleProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.promotionsService.getEligibleProducts(req.params.id, req.query);
      res.json(ResponseUtil.success(result, 'Eligible products retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve eligible products'),
      );
    }
  }

  async ListEligibleProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.promotionsService.ListEligibleProducts(req.body);
      res.json(ResponseUtil.success(result, 'Eligible products retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to list eligible products'),
      );
    }
  }

  async removeEligibleProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await this.promotionsService.removeEligibleProduct(req.params.id, req.params.productId);
      res.json(ResponseUtil.success(null, 'Eligible product removed successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to remove eligible product'),
      );
    }
  }

  async addFreeProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const freeProducts = await this.promotionsService.addFreeProducts(
        req.params.id,
        req.body.products,
      );
      res.status(201).json(ResponseUtil.success(freeProducts, 'Free products added successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to add free products'),
      );
    }
  }

  async getFreeProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.promotionsService.getFreeProducts(req.params.id, req.query);
      res.json(ResponseUtil.success(result, 'Free products retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve free products'),
      );
    }
  }

  async removeFreeProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await this.promotionsService.removeFreeProduct(req.params.id, req.params.freeProductId);
      res.json(ResponseUtil.success(null, 'Free product removed successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to remove free product'),
      );
    }
  }

  async validateCart(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResults = await this.promotionsService.validateCart(req.body);
      res.json(
        ResponseUtil.success(
          validationResults,
          validationResults.length > 0 ? 'Applicable promotions found' : 'No promotions applicable',
        ),
      );
    } catch (error) {
      next(error instanceof AppError ? error : new InvalidInputError('Failed to validate cart'));
    }
  }

  async getActivePromotions(req: Request, res: Response, next: NextFunction) {
    try {
      const promotions = await this.promotionsService.getActivePromotions();
      res.json(ResponseUtil.success(promotions, 'Active promotions retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve active promotions'),
      );
    }
  }

  async getAvailableFreeProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const freeProducts = await this.promotionsService.getAvailableFreeProducts(
        req.params.id,
        req.body.cartItems,
      );
      res.json(ResponseUtil.success(freeProducts, 'Available free products retrieved'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve available free products'),
      );
    }
  }

  async calculateDiscount(req: Request, res: Response, next: NextFunction) {
    try {
      const discount = await this.promotionsService.calculateDiscount(
        req.params.id,
        req.body.cartItems,
      );
      res.json(ResponseUtil.success(discount, 'Discount calculated successfully'));
    } catch (error) {
      next(
        error instanceof AppError ? error : new InvalidInputError('Failed to calculate discount'),
      );
    }
  }

  async getPromotionsByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const promotions = await this.promotionsService.getPromotionsByProduct(req.params.productId);
      res.json(ResponseUtil.success(promotions, 'Product promotions retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve product promotions'),
      );
    }
  }

  async getPromotionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.promotionsService.getPromotionStats(req.params.id);
      res.json(ResponseUtil.success(stats, 'Promotion statistics retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve promotion statistics'),
      );
    }
  }

  async getPromotionReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await this.promotionsService.getPromotionReport(req.query);
      res.json(ResponseUtil.success(report, 'Promotion report generated successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to generate promotion report'),
      );
    }
  }

  async checkUserEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt((req as any).user?.user_id || req.body.user_id);
      const isEligible = await this.promotionsService.checkUserEligibility(req.params.id, userId);
      res.json(
        ResponseUtil.success(
          { isEligible },
          isEligible ? 'User is eligible' : 'User is not eligible',
        ),
      );
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to check user eligibility'),
      );
    }
  }

  async getUserPromotionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.user_id || req.params.userId;
      const history = await this.promotionsService.getUserPromotionHistory(userId, req.query);
      res.json(ResponseUtil.success(history, 'User promotion history retrieved successfully'));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new InvalidInputError('Failed to retrieve user promotion history'),
      );
    }
  }
}
