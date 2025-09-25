import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation.schema';
import { KafkaModule } from './kafka/kafka.module';
import { MarketModule } from './market/market.module';
import { MatchingEngineModule } from './matching/matching.engine.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './websocket/events.module';
import { ChartsModule } from './charts/charts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    PrismaModule,
    KafkaModule,
    OrdersModule,
    MarketModule,
    MatchingEngineModule,
    ChartsModule,
    EventsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
