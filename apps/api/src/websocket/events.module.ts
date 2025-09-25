import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { EventsConsumerService } from './events.consumer.service';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [KafkaModule],
  providers: [EventsGateway, EventsConsumerService], // Both must be provided here
})
export class EventsModule {}
