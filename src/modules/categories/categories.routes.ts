import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { validateId } from '../../middleware/validation.middleware';
import upload from '../../config/multer.config';

export const categoriesRoutes = (controller: CategoriesController): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', upload.array('files', 1), controller.create.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));
  return router;
};
