import { Module } from '@nestjs/common';
import { KafkaAdminService } from './kafka.admin.service';
import { KafkaProducerService } from './kafka.producer.service';

@Module({
  providers: [KafkaProducerService, KafkaAdminService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
