import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingEngineService } from './matching.engine.service';

@Module({
  imports: [PrismaModule, KafkaModule], // Needs DB access and Kafka producer
  providers: [MatchingEngineService],
})
export class MatchingModule {}
