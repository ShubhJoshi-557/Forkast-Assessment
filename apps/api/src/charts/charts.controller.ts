// import { Controller, Get, Param } from '@nestjs/common';
// import { ChartsService } from './charts.service';

// @Controller('charts')
// export class ChartsController {
//   constructor(private readonly chartsService: ChartsService) {}

//   @Get(':tradingPair/candles')
//   getCandles(@Param('tradingPair') tradingPair: string) {
//     return this.chartsService.getCandles(tradingPair);
//   }
// }

import { Controller, Get, Param } from '@nestjs/common';
import { ChartsService } from './charts.service';

@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Get(':tradingPair/candles')
  getCandles(@Param('tradingPair') tradingPair: string) {
    // We'll fetch one-minute candles for the last 24 hours as an example.
    const interval = '1 minute';
    const hours = 24;

    // Call the new, correct method name with all its arguments
    return this.chartsService.getHistoricalCandles(
      tradingPair.toUpperCase(),
      interval,
      hours,
    );
  }
}
