import { Request, Response, NextFunction } from 'express';
import * as Yup from 'yup';
import { ResponseUtil } from '../utils/responce.utils';
import { DIContainer } from '../services/di-container';
import { ILoggerService } from '../services/logger.service';

export const validateId = async (req: Request, res: Response, next: NextFunction) => {
  const logger = DIContainer.resolve<ILoggerService>('LoggerService');
  const schema = Yup.object().shape({
    id: Yup.string().required(),
  });

  try {
    await schema.validate({ id: req.params.id });
    next();
  } catch (error) {
    logger.error(`Validation error: ${(error as Error).message}`);
    res.status(400).json(ResponseUtil.error((error as Error).message));
  }
};
