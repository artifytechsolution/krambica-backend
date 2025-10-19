import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { ICategoriesService } from '../../interfaces/categories-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class CategoriesController {
  private categoriesService: ICategoriesService;
  private logger: ILoggerService;

  constructor() {
    this.categoriesService = DIContainer.resolve<ICategoriesService>('CategoriesService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.categoriesService.getAll();
    res.json(ResponseUtil.success(result, 'Categories list'));
  }

  async getById(req: Request, res: Response) {
    console.log('------start---------');
    const item = await this.categoriesService.getById(req.params.id);
    res.json(ResponseUtil.success(item, 'Categorie found'));
  }

  async create(req: Request, res: Response) {
    const item = await this.categoriesService.create(req.body);
    res.status(201).json(ResponseUtil.success(item, 'Categorie created'));
  }

  async update(req: Request, res: Response) {
    const item = await this.categoriesService.update(parseInt(req.params.id), req.body);
    res.json(ResponseUtil.success(item, 'Categorie updated'));
  }

  async delete(req: Request, res: Response) {
    await this.categoriesService.delete(parseInt(req.params.id));
    res.json(ResponseUtil.success(null, 'Categorie deleted'));
  }
}
