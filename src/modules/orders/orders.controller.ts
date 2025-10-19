import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IOrdersService } from '../../interfaces/orders-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class OrdersController {
  private ordersService: IOrdersService;
  private logger: ILoggerService;

  constructor() {
    this.ordersService = DIContainer.resolve<IOrdersService>('OrdersService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.ordersService.getAll();
    res.json(ResponseUtil.success(result, 'Orders list'));
  }

  async getById(req: Request, res: Response) {
    const item = await this.ordersService.getById(req.params.id);
    res.json(ResponseUtil.success(item, 'Order found'));
  }

  async create(req: Request, res: Response) {
    const item = await this.ordersService.create(req.body);
    res.status(201).json(ResponseUtil.success(item, 'Order created  successfully'));
  }

  async update(req: Request, res: Response) {
    const item = await this.ordersService.update(parseInt(req.params.id), req.body);
    res.json(ResponseUtil.success(item, 'Order updated'));
  }

  async delete(req: Request, res: Response) {
    await this.ordersService.delete(parseInt(req.params.id));
    res.json(ResponseUtil.success(null, 'Order deleted'));
  }
}
