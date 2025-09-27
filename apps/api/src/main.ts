import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './websocket/redis.io.adapter';

/**
 * Bootstrap function that initializes and starts the NestJS application.
 *
 * This function:
 * - Creates the NestJS application instance
 * - Configures global validation pipes
 * - Sets up Redis WebSocket adapter for scaling
 * - Enables CORS for cross-origin requests
 * - Starts the HTTP server on port 3001
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule);

    // Configure global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip unknown properties
        transform: true, // Transform payloads to DTOs
        forbidNonWhitelisted: true, // Throw error for unknown properties
        transformOptions: {
          enableImplicitConversion: true, // Convert types automatically
        },
      }),
    );

    // Initialize and apply the Redis WebSocket Adapter for scaling
    logger.log('Initializing Redis WebSocket adapter...');
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('Redis WebSocket adapter initialized');

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Start the server
    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 API server running on: ${await app.getUrl()}`);
    logger.log(`📊 WebSocket server ready for real-time connections`);
    logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
void bootstrap();
