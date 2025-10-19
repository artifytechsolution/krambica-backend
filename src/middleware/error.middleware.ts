import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error.utils';
import { DIContainer } from '../services/di-container';
import { ILoggerService } from '../services/logger.service';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const logger = DIContainer.resolve<ILoggerService>('LoggerService');
  //@ts-ignore
  logger.error(`Error occurred: ${error.message}`, {
    stack: error.stack,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      data: null,
      message: error.message,
      errorDetails: error.errorDetails,
      ...(isDevelopment && { stack: error.stack }),
    });
  }

  res.status(500).json({
    status: 'error',
    data: null,
    message: 'Internal server error',
    errorDetails: isDevelopment ? error.message : undefined,
    ...(isDevelopment && { stack: error.stack }),
  });
};
