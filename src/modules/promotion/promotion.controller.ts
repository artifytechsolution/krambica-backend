import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IPromotionService } from '../../interfaces/promotion-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class PromotionController {
  private promotionService: IPromotionService;
  private logger: ILoggerService;

  constructor() {
    this.promotionService = DIContainer.resolve<IPromotionService>('PromotionService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.promotionService.getAll();
    res.json(ResponseUtil.success(result, 'Promotion list'));
  }

  async getById(req: Request, res: Response) {
    const item = await this.promotionService.getById(parseInt(req.params.id));
    res.json(ResponseUtil.success(item, 'Promotion found'));
  }

  async create(req: Request, res: Response) {
    const item = await this.promotionService.create(req.body);
    res.status(201).json(ResponseUtil.success(item, 'Promotion created'));
  }

  async update(req: Request, res: Response) {
    const item = await this.promotionService.update(parseInt(req.params.id), req.body);
    res.json(ResponseUtil.success(item, 'Promotion updated'));
  }

  async delete(req: Request, res: Response) {
    await this.promotionService.delete(parseInt(req.params.id));
    res.json(ResponseUtil.success(null, 'Promotion deleted'));
  }
}
