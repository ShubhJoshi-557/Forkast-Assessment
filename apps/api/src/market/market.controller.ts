import { Controller, Get } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('trades')
  getTrades() {
    return this.marketService.getRecentTrades();
  }

  @Get('orderbook')
  getOrderBook() {
    return this.marketService.getOrderBook();
  }
}
