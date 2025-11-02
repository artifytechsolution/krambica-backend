import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';

export class AuthController {
  private authService: IAuthService;
  private logger: ILoggerService;

  constructor() {
    this.authService = DIContainer.resolve<IAuthService>('AuthService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.authService.getAll();
      res.json(ResponseUtil.success(item, 'Get All user'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      //@ts-ignore
      const user = req.user.user_id;
      const item = await this.authService.getById(user);
      res.json(ResponseUtil.success(item, 'Auth found'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.authService.create(req.body);
      res.status(201).json(ResponseUtil.success(item, 'Auth created'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
  async Login(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('hello controller is called');
      const user = await this.authService.Login(req.body);
      res.status(201).json(ResponseUtil.success(user, 'Login user sucessfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
  async GenerateRefreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.authService.RefreshToken(req.body.refreshToken);
      res.status(201).json(ResponseUtil.success(user, 'Refresh Token Generated sucessfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await this.authService.update(req.params.id, req.body);
      res.status(201).json(ResponseUtil.success(item, 'Auth updated'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('body is here----');
      console.log(req.body.email);
      const user = await this.authService.sendOtp(req.body.email);
      res.status(201).json(ResponseUtil.success(user, 'Login user sucessfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.authService.delete(req.params.id);
      res.status(201).json(ResponseUtil.success({}, 'user deleted successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }
}
