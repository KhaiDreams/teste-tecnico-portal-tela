import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ErrorHandler {
  static handle(err: Error, req: Request, res: Response, next: NextFunction): void {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export const errorHandler = ErrorHandler.handle.bind(ErrorHandler);
