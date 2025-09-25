import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ChartsService } from './charts.service';

// Whitelist of accepted intervals to prevent SQL injection
const ALLOWED_INTERVALS = ['10 second', '1 minute', '1 hour', '1 day'];

@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Get(':tradingPair/candles')
  getCandles(
    @Param('tradingPair') tradingPair: string,
    @Query('interval') interval = '1 minute', // Default to '1 minute' if not provided
  ) {
    if (!ALLOWED_INTERVALS.includes(interval)) {
      throw new BadRequestException('Invalid interval parameter.');
    }
    // We'll fetch a relevant amount of data based on the interval
    const hours = interval.includes('day') ? 30 * 24 : 24;

    return this.chartsService.getHistoricalCandles(
      tradingPair.toUpperCase(),
      interval,
      hours,
    );
  }
}
