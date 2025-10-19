import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { validateId } from '../../middleware/validation.middleware';

export const ordersRoutes = (controller: OrdersController): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));
  return router;
};
