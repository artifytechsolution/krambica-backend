import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IOrdersService } from '../../interfaces/orders-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { CreateOrderDTO, UpdateOrderDTO } from './orders.types';

export class OrdersController {
  private ordersService: IOrdersService;
  private logger: ILoggerService;

  constructor() {
    this.ordersService = DIContainer.resolve<IOrdersService>('OrdersService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.ordersService.getAll(req.body);
    res.json(ResponseUtil.success(result, 'Orders retrieved'));
  }

  async getById(req: Request, res: Response) {
    const order = await this.ordersService.getById(req.params.id);
    res.json(ResponseUtil.success(order, 'Order retrieved'));
  }

  async create(req: Request, res: Response) {
    const orderData: CreateOrderDTO = req.body;
    const order = await this.ordersService.create(orderData);
    res.status(201).json(ResponseUtil.success(order, 'Order created'));
  }

  async update(req: Request, res: Response) {
    const updateData: UpdateOrderDTO = req.body;
    const order = await this.ordersService.update(parseInt(req.params.id), updateData);
    res.json(ResponseUtil.success(order, 'Order updated'));
  }

  async delete(req: Request, res: Response) {
    await this.ordersService.delete(req.params.id);
    res.json(ResponseUtil.success(null, 'Order deleted'));
  }

  async confirmOrder(req: Request, res: Response) {
    const order = await this.ordersService.confirmOrder(req.params.id);
    res.json(ResponseUtil.success(order, 'Order confirmed'));
  }

  async shipOrder(req: Request, res: Response) {
    const { trackingNumber, carrier } = req.body;
    const order = await this.ordersService.shipOrder(req.params.id, trackingNumber, carrier);
    res.json(ResponseUtil.success(order, 'Order shipped'));
  }

  async deliverOrder(req: Request, res: Response) {
    const order = await this.ordersService.deliverOrder(req.params.id);
    res.json(ResponseUtil.success(order, 'Order delivered'));
  }

  async cancelOrder(req: Request, res: Response) {
    const { reason } = req.body;
    await this.ordersService.cancelOrder(req.params.id, reason);
    res.json(ResponseUtil.success(null, 'Order cancelled'));
  }

  async getUserOrders(req: Request, res: Response) {
    const query = { ...req.body, user_id: parseInt(req.params.userId) };
    const result = await this.ordersService.getAll(query);
    res.json(ResponseUtil.success(result, 'User orders retrieved'));
  }

  async getActiveOrders(req: Request, res: Response) {
    const orders = await this.ordersService.getActiveOrders(parseInt(req.params.userId));
    res.json(ResponseUtil.success(orders, 'Active orders retrieved'));
  }

  async trackOrder(req: Request, res: Response) {
    const tracking = await this.ordersService.trackOrder(
      parseInt(req.params.userId),
      parseInt(req.params.orderId),
    );
    res.json(ResponseUtil.success(tracking, 'Order tracking retrieved'));
  }

  async getOrderStats(req: Request, res: Response) {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const stats = await this.ordersService.getOrderStats(dateFrom, dateTo);
    res.json(ResponseUtil.success(stats, 'Order statistics retrieved'));
  }

  async getRevenueStats(req: Request, res: Response) {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const groupBy = (req.query.groupBy as string) || 'day';
    const revenue = await this.ordersService.getRevenueStats(dateFrom, dateTo, groupBy);
    res.json(ResponseUtil.success(revenue, 'Revenue statistics retrieved'));
  }
}
