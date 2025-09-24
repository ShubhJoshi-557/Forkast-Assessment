import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsConsumerService } from './events.consumer.service';

@Module({
  providers: [EventsGateway, EventsConsumerService],
})
export class EventsModule {}
