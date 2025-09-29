import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module'; // 1. Import RedisModule
import { EventsModule } from '../websocket/events.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [PrismaModule, RedisModule, EventsModule], // 2. Add RedisModule here
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService], // Export MarketService for use in other modules
})
export class MarketModule {}
