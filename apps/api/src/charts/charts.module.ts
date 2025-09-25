import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChartsController } from './charts.controller';
import { ChartsService } from './charts.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChartsController],
  providers: [ChartsService],
})
export class ChartsModule {}
