import { Router } from 'express';
import { CuponController } from './cupon.controller';
import { validateId } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/authMiddleware';

export const cuponRoutes = (controller: CuponController): Router => {
  const router = Router();

  // Basic CRUD Operations
  // router.post('/', AuthMiddleware('access'), controller.create.bind(controller));
  router.post('/list', controller.getAll.bind(controller));
  router.post('/', controller.create.bind(controller));
  // router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.get('/code/:code', controller.getByCode.bind(controller));
  router.put('/:id', validateId, AuthMiddleware('access'), controller.update.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));

  // Validation & Redemption Operations
  router.post('/:code/validate', controller.validate.bind(controller));
  // router.post('/:code/redeem', AuthMiddleware('access'), controller.redeem.bind(controller));
  router.post('/:code/redeem', controller.redeem.bind(controller));
  router.post('/:code/revert', AuthMiddleware('access'), controller.revert.bind(controller));

  // Management Operations
  router.patch(
    '/:id/status',
    validateId,
    AuthMiddleware('access'),
    controller.updateStatus.bind(controller),
  );

  // Analytics Routes
  router.get(
    '/:id/statistics',
    validateId,
    AuthMiddleware('access'),
    controller.getStatistics.bind(controller),
  );
  // router.get(
  //   '/:code/redemptions',
  //   AuthMiddleware('access'),
  //   controller.getRedemptionHistory.bind(controller),
  // );
  router.get(
    '/users/:userId/coupons',
    AuthMiddleware('access'),
    controller.getUserCoupons.bind(controller),
  );

  return router;
};
