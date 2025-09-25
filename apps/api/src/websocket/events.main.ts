import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { EventsModule } from './events.module';

import { RedisIoAdapter } from './redis.io.adapter'; // 1. Import the adapter

async function bootstrap() {
  const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
  if (!kafkaBrokerUrl) {
    throw new Error('KAFKA_BROKER_URL environment variable is not set!');
  }

  // This is the main NestJS application that will also host our WebSocket server
  const app = await NestFactory.create(EventsModule);

  // 2. Create and connect the Redis adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  // 3. Use the adapter for all WebSockets
  app.useWebSocketAdapter(redisIoAdapter);

  // Connect the app to Kafka as a microservice consumer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: [kafkaBrokerUrl] },
      consumer: { groupId: 'websocket-group' },
    },
  });

  await app.startAllMicroservices();

  // We don't need app.listen() because this is a headless service
  console.log('🚀 Events service with WebSockets is running');
}
void bootstrap();
