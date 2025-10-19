import { Request, Response, NextFunction } from 'express';

import { AppError } from '../utils/error.utils';
import { Requestuser } from '../modules/auth/auth.types';
import JwtToken from '../utils/jwtToken.utils';
import { ConfigService } from '../services/config.service';

export const AuthMiddleware = (type: 'access' | 'refresh' = 'access') => {
  const configService = new ConfigService();
  return (req: any, res: Response, next: NextFunction) => {
    try {
      const token =
        req.headers.authorization?.split(' ')[1] ||
        (type === 'refresh' ? req.body.refreshToken : null);

      console.log('token is comming hereeee');
      console.log(token);
      console.log(configService.get('JWT_ACCESS_SECRET'));
      if (!token) {
        throw new AppError(
          401,
          `${type === 'access' ? 'Access' : 'Refresh'} token is missing` as string,
          'TOKEN_MISSING',
        );
      }

      const verifiedUser =
        type === 'access'
          ? JwtToken.verifyToken(
              token,
              configService.get('JWT_ACCESS_SECRET') as string,
            )
          : JwtToken.verifyToken(
              token,
              configService.get('REFRESH_ACCESS_SECRET') as string,
            );
      console.log('verify user is here');
      console.log(verifiedUser);
      req.user = verifiedUser;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(
          new AppError(
            401,
            `${type === 'access' ? 'Access' : 'Refresh'} token expired`,
            'TOKEN_EXPIRED',
          ),
        );
      }

      if (err.name === 'JsonWebTokenError') {
        return next(
          new AppError(
            403,
            `Invalid ${type === 'access' ? 'access' : 'refresh'} token`,
            'INVALID_TOKEN',
          ),
        );
      }

      return next(err);
    }
  };
};
