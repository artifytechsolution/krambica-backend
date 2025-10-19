import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateId } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/authMiddleware';

export const authRoutes = (controller: AuthController): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/me', AuthMiddleware('access'), controller.getById.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.post('/login', controller.Login.bind(controller));
  router.post(
    '/refreshToken',
    AuthMiddleware('refresh'),
    controller.GenerateRefreshToken.bind(controller),
  );
  router.post('/sendotp', controller.sendOtp.bind(controller));
  return router;
};
