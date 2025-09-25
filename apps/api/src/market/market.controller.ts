import { Controller, Get, Param } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  // Route is now parameterized: e.g., /market/BTC-USD/trades
  @Get(':tradingPair/trades')
  getTrades(@Param('tradingPair') tradingPair: string) {
    return this.marketService.getRecentTrades(tradingPair.toUpperCase());
  }

  // Route is now parameterized: e.g., /market/BTC-USD/orderbook
  @Get(':tradingPair/orderbook')
  getOrderBook(@Param('tradingPair') tradingPair: string) {
    return this.marketService.getOrderBook(tradingPair.toUpperCase());
  }
}
