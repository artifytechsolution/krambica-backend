import { Router } from 'express';
import { UnitsController } from './units.controller';
import { validateId } from '../../middleware/validation.middleware';

export const unitsRoutes = (controller: UnitsController): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', controller.update.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));
  return router;
};
