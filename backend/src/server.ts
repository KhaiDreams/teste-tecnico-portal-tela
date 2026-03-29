import http from 'http';
import createApp from './app';
import config from './config/env';
import { databaseService } from './database/connection';
import { logger } from './utils/logger';

async function startServer() {
  try {
    const app = createApp();

    // Initialize database
    logger.info('Initializing database...');
    await databaseService.initialize();
    logger.info('Database initialized successfully');

    // Create HTTP server
    const server = http.createServer(app);

    // Start listening
    server.listen(config.PORT, () => {
      logger.info(`Server listening on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`API URL: ${config.API_URL}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        try {
          await databaseService.close();
          logger.info('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        try {
          await databaseService.close();
          logger.info('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });
    });

    // Unhandled rejection
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });

    // Unhandled exception
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
