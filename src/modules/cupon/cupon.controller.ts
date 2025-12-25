import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';
import { CuponService } from './cupon.service';

export class CuponController {
  private cuponService: CuponService;
  private logger: ILoggerService;

  constructor() {
    this.cuponService = DIContainer.resolve<CuponService>('CuponService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  // 1. Create coupon
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('create cupon is callled ------->');
      console.log(req.body);
      if (!req.body) {
        throw new InvalidInputError('please pass the body data');
      }
      const coupon = await this.cuponService.Create(req.body);
      res.status(201).json(ResponseUtil.success(coupon, 'Coupon created successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 2. Get all coupons with filtering, pagination, search
  // async getAll(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const coupons = await this.cuponService.list(req.query);
  //     res.json(ResponseUtil.success(coupons, 'Coupons retrieved successfully'));
  //   } catch (error) {
  //     if (error instanceof AppError) {
  //       next(
  //         error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
  //       );
  //     }
  //   }
  // }

  // 3. Get coupon by ID
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('get by id is called');
      console.log(req.params.id);
      const coupon = await this.cuponService.getById(req.params.id);
      res.json(ResponseUtil.success(coupon, 'Coupon found'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await this.cuponService.getAll(req.body);
      res.json(ResponseUtil.success(coupon, 'Coupon found'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 4. Get coupon by code
  async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await this.cuponService.getByCode(req.params.code);
      res.json(ResponseUtil.success(coupon, 'Coupon found'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 5. Update coupon
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await this.cuponService.update(req.params.id, req.body);
      res.json(ResponseUtil.success(coupon, 'Coupon updated successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 6. Delete coupon (soft delete)
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await this.cuponService.delete(req.params.id);
      res.json(ResponseUtil.success(coupon, 'Coupon deleted successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 7. Validate coupon
  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResult = await this.cuponService.validate({
        code: req.params.code,
        ...req.body,
      });
      res.json(ResponseUtil.success(validationResult, 'Coupon is valid'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 8. Redeem coupon
  async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      const redemptionResult = await this.cuponService.redeem({
        code: req.params.code,
        ...req.body,
      });
      res.json(ResponseUtil.success(redemptionResult, 'Coupon redeemed successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 9. Revert coupon redemption
  async revert(req: Request, res: Response, next: NextFunction) {
    try {
      const revertResult = await this.cuponService.revert({
        code: req.params.code,
        ...req.body,
      });
      res.json(ResponseUtil.success(revertResult, 'Coupon redemption reverted successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // 10. Update coupon status
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await this.cuponService.updateStatus(req.params.id, req.body.status);
      res.json(
        ResponseUtil.success(coupon, `Coupon ${req.body.status.toLowerCase()} successfully`),
      );
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // Bonus: Get coupon statistics
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = await this.cuponService.getCouponStatistics(req.params.id);
      res.json(ResponseUtil.success(statistics, 'Coupon statistics retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  // Bonus: Get redemption history
  // async getRedemptionHistory(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const history = await this.cuponService.getRedemptionHistory(req.params.code, req.query);
  //     res.json(ResponseUtil.success(history, 'Redemption history retrieved successfully'));
  //   } catch (error) {
  //     if (error instanceof AppError) {
  //       next(
  //         error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
  //       );
  //     }
  //   }
  // }

  // Bonus: Get user coupons
  async getUserCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      const userCoupons = await this.cuponService.getUserCoupons(req.params.userId, req.query);
      res.json(ResponseUtil.success(userCoupons, 'User coupons retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
}
