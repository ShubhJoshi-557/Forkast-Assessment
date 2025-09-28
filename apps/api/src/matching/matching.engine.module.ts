import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from 'src/redis/redis.module';
import { KafkaModule } from '../kafka/kafka.module';
import { MarketModule } from '../market/market.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingEngineService } from './matching.engine.service';

// 1. Validate the environment variable at the top of the file
const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
if (!kafkaBrokerUrl) {
  throw new Error('KAFKA_BROKER_URL environment variable is not set!');
}

@Module({
  imports: [
    PrismaModule,
    KafkaModule,
    MarketModule,
    RedisModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            // 2. Use the validated variable here
            brokers: [kafkaBrokerUrl],
          },
        },
      },
    ]),
  ],
  providers: [MatchingEngineService],
})
export class MatchingEngineModule {}
