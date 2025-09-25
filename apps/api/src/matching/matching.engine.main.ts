import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MatchingEngineModule } from './matching.engine.module';

async function bootstrap() {
  // 1. Get the environment variable and validate it
  const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
  if (!kafkaBrokerUrl) {
    throw new Error('KAFKA_BROKER_URL environment variable is not set!');
  }

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    MatchingEngineModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          // 2. Use the validated variable. TypeScript is now happy.
          brokers: [kafkaBrokerUrl],
        },
        consumer: {
          groupId: 'matching-engine',
        },
      },
    },
  );
  await app.listen();
  console.log('🚀 Matching Engine microservice is running');
}
void bootstrap();
