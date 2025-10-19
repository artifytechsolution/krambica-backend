import { Router } from 'express';
import { DatabaseController } from './database.controller';
import { validateId } from '../../middleware/validation.middleware';

export const databaseRoutes = (controller: DatabaseController): Router => {
  const router = Router();
  return router;
};
