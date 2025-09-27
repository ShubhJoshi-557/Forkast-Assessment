import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './websocket/redis.io.adapter'; // Import the new adapter

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Initialize and apply the Redis WebSocket Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // This is for regular HTTP requests (your REST API) and is still needed.
  app.enableCors();

  await app.listen(3001);
  console.log(`🚀 API server running on: ${await app.getUrl()}`);
}
void bootstrap();
