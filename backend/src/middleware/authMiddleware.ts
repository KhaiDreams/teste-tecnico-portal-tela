import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { logger } from '../utils/logger';
import { JWTClaims } from '../types/index';

declare global {
  namespace Express {
    interface Request {
      user?: JWTClaims;
      token?: string;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Missing authorization header');
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Missing authorization header',
          code: 'MISSING_AUTH_HEADER',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.warn('Invalid authorization header format');
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Invalid authorization header format',
          code: 'INVALID_AUTH_FORMAT',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JWTClaims;
      req.user = decoded;
      req.token = token;
      logger.debug('Token validated successfully', { userId: decoded.sub });
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired');
        res.status(401).json({
          success: false,
          error: {
            message: 'Unauthorized: Token expired',
            code: 'TOKEN_EXPIRED',
            timestamp: new Date().toISOString(),
          },
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token');
        res.status(401).json({
          success: false,
          error: {
            message: 'Unauthorized: Invalid token',
            code: 'INVALID_TOKEN',
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const generateToken = (userId: string, expiresIn?: string): string => {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: expiresIn || config.JWT_EXPIRES_IN,
  } as any);
};

export default authMiddleware;
