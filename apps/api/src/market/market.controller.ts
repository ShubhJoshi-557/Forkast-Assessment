import { Controller, Get, Logger, Param } from '@nestjs/common';
import { MarketService } from './market.service';

/**
 * MarketController handles HTTP requests for market data.
 *
 * This controller provides endpoints for:
 * - Recent trade history
 * - Current order book data
 *
 * All endpoints are parameterized by trading pair (e.g., BTC-USD, ETH-USD)
 */
@Controller('market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly marketService: MarketService) {}

  /**
   * Retrieves recent trades for a specific trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @returns Array of recent trades
   *
   * @example
   * GET /market/BTC-USD/trades
   */
  @Get(':tradingPair/trades')
  async getTrades(@Param('tradingPair') tradingPair: string) {
    const normalizedPair = tradingPair.toUpperCase();
    this.logger.log(`Fetching recent trades for ${normalizedPair}`);

    try {
      const trades = await this.marketService.getRecentTrades(normalizedPair);
      this.logger.debug(
        `Retrieved ${trades.length} trades for ${normalizedPair}`,
      );
      return trades;
    } catch (error) {
      this.logger.error(`Failed to fetch trades for ${normalizedPair}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves the current order book for a specific trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @returns Order book containing bids and asks
   *
   * @example
   * GET /market/BTC-USD/orderbook
   */
  @Get(':tradingPair/orderbook')
  async getOrderBook(@Param('tradingPair') tradingPair: string) {
    const normalizedPair = tradingPair.toUpperCase();
    this.logger.log(`Fetching order book for ${normalizedPair}`);

    try {
      const orderBook = await this.marketService.getOrderBook(normalizedPair);
      this.logger.debug(
        `Retrieved order book for ${normalizedPair}: ${orderBook.bids.length} bids, ${orderBook.asks.length} asks`,
      );
      return orderBook;
    } catch (error) {
      this.logger.error(
        `Failed to fetch order book for ${normalizedPair}:`,
        error,
      );
      throw error;
    }
  }
}
