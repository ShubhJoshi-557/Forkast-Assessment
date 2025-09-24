import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { KafkaModule } from '../kafka/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [KafkaModule, PrismaModule], // Import KafkaModule to use the producer
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
