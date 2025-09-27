import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MarketService handles market data retrieval and order book management.
 *
 * This service provides:
 * - Recent trade history retrieval
 * - Order book data with proper bid/ask separation
 * - Real-time market data for frontend consumption
 * - Optimized database queries for high-frequency access
 */
@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves recent trades for a specific trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @returns Array of recent trades ordered by creation time (newest first)
   */
  async getRecentTrades(tradingPair: string): Promise<
    Array<{
      id: string;
      tradingPair: string;
      buyOrderId: string;
      sellOrderId: string;
      quantity: any;
      price: any;
      createdAt: Date;
    }>
  > {
    try {
      this.logger.debug(`Fetching recent trades for ${tradingPair}`);

      const trades = await this.prisma.trade.findMany({
        where: { tradingPair },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      this.logger.debug(
        `Retrieved ${trades.length} recent trades for ${tradingPair}`,
      );
      return trades;
    } catch (error) {
      this.logger.error(
        `Failed to fetch recent trades for ${tradingPair}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves the current order book for a specific trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @returns Object containing bids and asks arrays
   */
  async getOrderBook(tradingPair: string): Promise<{
    bids: Array<{
      price: string;
      quantity: string;
      filledQuantity: string;
      status: OrderStatus;
    }>;
    asks: Array<{
      price: string;
      quantity: string;
      filledQuantity: string;
      status: OrderStatus;
    }>;
  }> {
    try {
      this.logger.debug(`Fetching order book for ${tradingPair}`);

      const orders = await this.prisma.order.findMany({
        where: {
          tradingPair,
          status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
        },
        orderBy: { price: 'desc' },
      });

      // Separate and format bids (BUY orders)
      const bids = orders
        .filter((o) => o.type === OrderType.BUY)
        .map((o) => ({
          price: o.price.toString(),
          quantity: o.quantity.minus(o.filledQuantity).toString(),
          filledQuantity: o.filledQuantity.toString(),
          status: o.status,
        }));

      // Separate and format asks (SELL orders) - sorted by price ascending
      const asks = orders
        .filter((o) => o.type === OrderType.SELL)
        .sort((a, b) => a.price.comparedTo(b.price))
        .map((o) => ({
          price: o.price.toString(),
          quantity: o.quantity.minus(o.filledQuantity).toString(),
          filledQuantity: o.filledQuantity.toString(),
          status: o.status,
        }));

      this.logger.debug(
        `Retrieved order book for ${tradingPair}: ${bids.length} bids, ${asks.length} asks`,
      );

      return { bids, asks };
    } catch (error) {
      this.logger.error(
        `Failed to fetch order book for ${tradingPair}:`,
        error,
      );
      throw error;
    }
  }
}
