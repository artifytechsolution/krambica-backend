import { Router } from 'express';
import { PromotionController } from './promotion.controller';
import { validateId } from '../../middleware/validation.middleware';

export const promotionRoutes = (controller: PromotionController): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));
  return router;
};
