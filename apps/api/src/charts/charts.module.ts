import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../websocket/events.module'; // <-- Add this import
import { ChartsController } from './charts.controller';
import { ChartsService } from './charts.service';

@Module({
  imports: [PrismaModule, EventsModule], // <-- Add EventsModule here
  controllers: [ChartsController],
  providers: [ChartsService],
})
export class ChartsModule {}
