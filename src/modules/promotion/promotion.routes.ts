// promotions.routes.ts

import { Router } from 'express';
import { PromotionController } from './promotion.controller';
import { validateId } from '../../middleware/validation.middleware';

export const promotionRoutes = (controller: PromotionController): Router => {
  const router = Router();

  // Admin - Promotion CRUD
  router.post('/admin', controller.createPromotion.bind(controller));
  router.get('/admin', controller.getAllPromotions.bind(controller));
  router.get('/admin/:id', validateId, controller.getPromotionById.bind(controller));
  router.put('/admin/:id', validateId, controller.updatePromotion.bind(controller));
  router.patch('/admin/:id/status', validateId, controller.updatePromotionStatus.bind(controller));
  router.delete('/admin/:id', validateId, controller.deletePromotion.bind(controller));

  // Admin - Eligible Products
  router.post(
    '/admin/:id/eligible-products',
    validateId,
    controller.addEligibleProducts.bind(controller),
  );
  router.get(
    '/admin/:id/eligible-products',
    validateId,
    controller.getEligibleProducts.bind(controller),
  );
  router.delete(
    '/admin/:id/eligible-products/:productId',
    validateId,
    controller.removeEligibleProduct.bind(controller),
  );

  // Admin - Free Products
  router.post('/admin/:id/free-products', validateId, controller.addFreeProducts.bind(controller));
  router.get('/admin/:id/free-products', validateId, controller.getFreeProducts.bind(controller));
  router.delete(
    '/admin/:id/free-products/:freeProductId',
    validateId,
    controller.removeFreeProduct.bind(controller),
  );

  // Admin - Analytics
  router.get('/admin/:id/stats', validateId, controller.getPromotionStats.bind(controller));
  router.get('/admin/report', controller.getPromotionReport.bind(controller));

  // Customer - Discovery
  router.get('/active', controller.getActivePromotions.bind(controller));
  router.get('/product/:productId', validateId, controller.getPromotionsByProduct.bind(controller));

  // Customer - Cart
  router.post('/validate-cart', controller.validateCart.bind(controller));
  router.post(
    '/:id/available-free-products',
    validateId,
    controller.getAvailableFreeProducts.bind(controller),
  );
  router.post('/:id/calculate-discount', validateId, controller.calculateDiscount.bind(controller));

  // Customer - User
  router.post(
    '/:id/check-eligibility',
    validateId,
    controller.checkUserEligibility.bind(controller),
  );
  router.get('/user/history', controller.getUserPromotionHistory.bind(controller));
  router.get(
    '/user/:userId/history',
    validateId,
    controller.getUserPromotionHistory.bind(controller),
  );

  return router;
};
