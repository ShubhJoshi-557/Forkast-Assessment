import { Module } from '@nestjs/common';
import { KafkaModule } from 'src/kafka/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsConsumerService } from './events.consumer.service';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [KafkaModule, PrismaModule],
  providers: [EventsGateway, EventsConsumerService],
  // --- ADD THIS 'exports' ARRAY ---
  // This makes EventsGateway available for injection in other modules.
  exports: [EventsGateway],
})
export class EventsModule {}
