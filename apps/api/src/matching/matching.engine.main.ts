import { NestFactory } from '@nestjs/core';
import { MatchingEngineModule } from './matching.engine.module';

async function bootstrap() {
  // Create a regular NestJS application instead of microservice
  // The Kafka consumer is handled by MatchingEngineService directly
  const app = await NestFactory.createApplicationContext(MatchingEngineModule);

  console.log('🚀 Matching Engine service is running');

  // Keep the application running
  process.on('SIGINT', () => {
    void app.close().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void app.close().then(() => process.exit(0));
  });
}
void bootstrap();
