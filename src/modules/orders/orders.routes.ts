import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { validateId } from '../../middleware/validation.middleware';

export const ordersRoutes = (controller: OrdersController): Router => {
  const router = Router();

  // CRUD (5)
  router.post('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));

  // Status Management (4)
  router.patch('/:id/confirm', validateId, controller.confirmOrder.bind(controller));
  router.patch('/:id/ship', validateId, controller.shipOrder.bind(controller));
  router.patch('/:id/deliver', validateId, controller.deliverOrder.bind(controller));
  router.patch('/:id/cancel', validateId, controller.cancelOrder.bind(controller));

  // User Operations (3)
  router.post('/users/:userId/orders', controller.getUserOrders.bind(controller));
  router.get('/users/:userId/active', controller.getActiveOrders.bind(controller));
  router.get('/users/:userId/orders/:orderId/track', controller.trackOrder.bind(controller));

  // Analytics (2)
  router.get('/stats/overview', controller.getOrderStats.bind(controller));
  router.get('/stats/revenue', controller.getRevenueStats.bind(controller));

  return router;
};
