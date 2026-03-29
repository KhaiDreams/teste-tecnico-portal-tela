import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { body } from 'express-validator';
import config from './config/env';
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { generatePostLimiter, apiLimiter } from './middleware/rateLimitMiddleware';
import { contentController } from './controllers/contentController';
import { validateRequest } from './middleware/validationHandler';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  
  app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  }));

  app.use(express.json({ limit: '5mb' }));
  app.set('trust proxy', 1);
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  app.use(apiLimiter);

  // Health check (public endpoint)
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Advanced health check (public endpoint)
  app.get('/api/health/detailed', contentController.healthCheck.bind(contentController));

  // Public routes
  app.post(
    '/api/generate-post',
    generatePostLimiter,
    body('url')
      .isURL()
      .withMessage('Invalid URL format')
      .trim(),
    validateRequest,
    contentController.generatePost.bind(contentController)
  );

  // Protected routes
  app.use('/api/posts', authMiddleware);

  app.get(
    '/api/posts/:id',
    contentController.getPostStatus.bind(contentController)
  );

  app.get(
    '/api/posts',
    contentController.listPosts.bind(contentController)
  );

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Content Generator Service',
      version: '1.0.0',
      description: 'Automated content generation and WordPress publishing',
      endpoints: {
        health: '/api/health',
        generate: 'POST /api/generate-post',
        posts: 'GET /api/posts',
        postDetail: 'GET /api/posts/:id',
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
