import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaModule } from '../kafka/kafka.module';
import { MarketModule } from '../market/market.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

// 1. Validate the environment variable at the top of the file
const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
if (!kafkaBrokerUrl) {
  throw new Error('KAFKA_BROKER_URL environment variable is not set!');
}

@Module({
  imports: [
    KafkaModule,
    MarketModule,
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
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
