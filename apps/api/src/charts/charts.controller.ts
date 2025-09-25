import { Controller, Get, Param } from '@nestjs/common';
import { ChartsService } from './charts.service';

@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Get(':tradingPair/candles')
  getCandles(@Param('tradingPair') tradingPair: string) {
    return this.chartsService.getCandles(tradingPair);
  }
}
