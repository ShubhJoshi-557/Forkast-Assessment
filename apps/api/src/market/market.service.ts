import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * MarketService handles market data retrieval and order book management.
 *
 * This service provides:
 * - Recent trade history retrieval
 * - Order book data with proper bid/ask separation
 * - Real-time market data for frontend consumption
 * - Optimized database queries for high-frequency access
 * - Redis-based caching for ultra-fast order book access
 */
@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  // Cache configuration
  private static readonly ORDER_BOOK_CACHE_TTL = 1; // 1 second TTL for order book
  private static readonly ORDER_BOOK_CACHE_PREFIX = 'orderbook';
  private static readonly ORDER_BOOK_BIDS_PREFIX = 'bids';
  private static readonly ORDER_BOOK_ASKS_PREFIX = 'asks';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

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
      aggressorType: 'BUY' | 'SELL';
    }>
  > {
    try {
      this.logger.debug(`Fetching recent trades for ${tradingPair}`);

      const trades = await this.prisma.trade.findMany({
        where: { tradingPair },
        include: {
          buyOrder: {
            select: {
              type: true,
              createdAt: true,
            },
          },
          sellOrder: {
            select: {
              type: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Transform trades to include aggressor type
      // The aggressor is the taker - the incoming order that crossed the spread
      // In the matching engine, the newOrder (taker) is always the aggressor
      const transformedTrades = trades.map((trade) => {
        // The aggressor is determined by which order was the incoming order (taker)
        // We need to determine which order was the taker by comparing creation times
        // The taker (incoming order) will have a later creation time than the maker (existing order)
        const buyOrderTime = new Date(trade.buyOrder.createdAt).getTime();
        const sellOrderTime = new Date(trade.sellOrder.createdAt).getTime();

        // The order with the later timestamp is the taker (aggressor)
        const aggressorType =
          buyOrderTime > sellOrderTime
            ? trade.buyOrder.type
            : trade.sellOrder.type;

        return {
          id: trade.id,
          tradingPair: trade.tradingPair,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          quantity: trade.quantity,
          price: trade.price,
          createdAt: trade.createdAt,
          aggressorType,
        };
      });

      this.logger.debug(
        `Retrieved ${transformedTrades.length} recent trades for ${tradingPair}`,
      );
      return transformedTrades;
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
   * Uses Redis caching for ultra-fast access with database fallback.
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

      // Try Redis cache first
      const cachedOrderBook = await this.getCachedOrderBook(tradingPair);
      if (cachedOrderBook) {
        this.logger.debug(`Order book cache hit for ${tradingPair}`);
        return cachedOrderBook;
      }

      this.logger.debug(
        `Order book cache miss for ${tradingPair}, fetching from database`,
      );

      // Fallback to database
      const orderBook = await this.buildOrderBookFromDatabase(tradingPair);

      // Cache the result for next time
      await this.cacheOrderBook(tradingPair, orderBook);

      return orderBook;
    } catch (error) {
      this.logger.error(
        `Failed to fetch order book for ${tradingPair}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves order book from Redis cache.
   *
   * @param tradingPair - Trading pair identifier
   * @returns Cached order book or null if not found
   */
  private async getCachedOrderBook(tradingPair: string): Promise<{
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
  } | null> {
    try {
      const cacheKey = `${MarketService.ORDER_BOOK_CACHE_PREFIX}:${tradingPair}`;
      const cachedData = await this.redisService.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData) as {
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
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get cached order book for ${tradingPair}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Caches order book data in Redis.
   *
   * @param tradingPair - Trading pair identifier
   * @param orderBook - Order book data to cache
   */
  private async cacheOrderBook(
    tradingPair: string,
    orderBook: {
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
    },
  ): Promise<void> {
    try {
      const cacheKey = `${MarketService.ORDER_BOOK_CACHE_PREFIX}:${tradingPair}`;
      await this.redisService.setWithTTL(
        cacheKey,
        JSON.stringify(orderBook),
        MarketService.ORDER_BOOK_CACHE_TTL,
      );

      this.logger.debug(`Cached order book for ${tradingPair}`);
    } catch (error) {
      this.logger.warn(`Failed to cache order book for ${tradingPair}:`, error);
      // Don't throw error - caching failure shouldn't break the request
    }
  }

  /**
   * Builds order book from database (fallback method).
   *
   * @param tradingPair - Trading pair identifier
   * @returns Order book data from database
   */
  private async buildOrderBookFromDatabase(tradingPair: string): Promise<{
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
      `Built order book from database for ${tradingPair}: ${bids.length} bids, ${asks.length} asks`,
    );

    return { bids, asks };
  }

  /**
   * Invalidates order book cache for a trading pair.
   * Called when orders are updated to ensure cache consistency.
   *
   * @param tradingPair - Trading pair identifier
   */
  async invalidateOrderBookCache(tradingPair: string): Promise<void> {
    try {
      const cacheKey = `${MarketService.ORDER_BOOK_CACHE_PREFIX}:${tradingPair}`;
      await this.redisService.del(cacheKey);
      this.logger.debug(`Invalidated order book cache for ${tradingPair}`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate order book cache for ${tradingPair}:`,
        error,
      );
    }
  }
}
