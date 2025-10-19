import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IUnitsService } from '../../interfaces/units-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class UnitsController {
  private unitsService: IUnitsService;
  private logger: ILoggerService;

  constructor() {
    this.unitsService = DIContainer.resolve<IUnitsService>('UnitsService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.unitsService.getAll();
    res.json(ResponseUtil.success(result, 'unit list'));
  }

  async getById(req: Request, res: Response) {
    const item = await this.unitsService.getById(req.params.id);
    res.json(ResponseUtil.success(item, 'Unit found'));
  }

  async create(req: Request, res: Response) {
    console.log('units crated sucessfully');
    console.log(req.body);
    const item = await this.unitsService.create(req.body);
    res.status(201).json(ResponseUtil.success(item, 'Unit created'));
  }

  async update(req: Request, res: Response) {
    const item = await this.unitsService.update(parseInt(req.params.id), req.body);
    res.json(ResponseUtil.success(item, 'Unit updated'));
  }

  async delete(req: Request, res: Response) {
    await this.unitsService.delete(parseInt(req.params.id));
    res.json(ResponseUtil.success(null, 'Unit deleted'));
  }
}
