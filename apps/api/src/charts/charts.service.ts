/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, Trade } from '@prisma/client';
import { Consumer, Kafka } from 'kafkajs';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';

/**
 * Candle data structure for OHLCV (Open, High, Low, Close, Volume) representation.
 */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * ChartsService handles real-time candlestick data generation and historical data retrieval.
 *
 * This service:
 * - Consumes trade events from Kafka to build real-time candles
 * - Maintains in-memory live candles for each trading pair
 * - Provides historical candlestick data via database queries
 * - Broadcasts real-time candle updates via WebSocket
 */
@Injectable()
export class ChartsService implements OnModuleInit {
  private readonly logger = new Logger(ChartsService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  // In-memory store for the current, real-time candles for each trading pair
  private readonly liveCandles = new Map<string, Candle>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    // Validate required environment variables
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables',
      );
    }

    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 30000,
    });
    this.consumer = this.kafka.consumer({
      groupId: 'charts-group',
      sessionTimeout: 60000,
      heartbeatInterval: 10000,
    });
  }

  /**
   * Initializes the charts service by connecting to Kafka and starting trade consumption.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing charts service...');

      await this.consumer.connect();
      this.logger.log('Connected to Kafka for charts service');

      await this.consumer.subscribe({
        topic: 'trades.executed',
        fromBeginning: false,
      });
      this.logger.log('Subscribed to trades.executed topic');

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) {
            this.logger.warn('Received message with no value, skipping');
            return;
          }

          try {
            const trade = JSON.parse(message.value.toString()) as Trade;
            await Promise.resolve(); // Satisfy async requirement
            this.aggregateTradeToCandle(trade);
          } catch (error) {
            this.logger.error('Failed to parse trade message:', error);
          }
        },
      });

      this.logger.log('Charts service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize charts service:', error);
      throw error;
    }
  }

  /**
   * Aggregates a trade into a real-time candlestick and broadcasts updates.
   *
   * @param trade - Trade data to aggregate
   */
  private aggregateTradeToCandle(trade: Trade): void {
    try {
      const tradePrice = parseFloat(trade.price.toString());
      const tradeQuantity = parseFloat(trade.quantity.toString());
      const tradeTime = new Date(trade.createdAt).getTime();

      // Get the timestamp for the start of the current 10-second interval
      const candleTime = Math.floor(tradeTime / 10000) * 10000;

      const existingCandle = this.liveCandles.get(trade.tradingPair);

      if (existingCandle && existingCandle.time === candleTime) {
        // Update the existing candle for this interval
        existingCandle.high = Math.max(existingCandle.high, tradePrice);
        existingCandle.low = Math.min(existingCandle.low, tradePrice);
        existingCandle.close = tradePrice; // The latest trade sets the close price
        existingCandle.volume += tradeQuantity;
        this.liveCandles.set(trade.tradingPair, existingCandle);
      } else {
        // This is the first trade of a new interval, create a new candle
        const newCandle: Candle = {
          time: candleTime,
          open: tradePrice,
          high: tradePrice,
          low: tradePrice,
          close: tradePrice,
          volume: tradeQuantity,
        };
        this.liveCandles.set(trade.tradingPair, newCandle);
      }

      // Broadcast the updated candle to all subscribed clients
      const latestCandle = this.liveCandles.get(trade.tradingPair);
      if (latestCandle) {
        this.logger.debug(
          `Broadcasting candle_update for ${trade.tradingPair}:`,
          latestCandle,
        );
        this.eventsGateway.server
          .to(trade.tradingPair)
          .emit('candle_update', latestCandle);
      }
    } catch (error) {
      this.logger.error('Failed to aggregate trade to candle:', error);
    }
  }

  /**
   * Retrieves historical candlestick data for a trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @param interval - Time interval for candles (e.g., "1 minute", "1 hour")
   * @param hours - Number of hours of historical data to retrieve
   * @returns Array of historical candlestick data
   */
  async getHistoricalCandles(
    tradingPair: string,
    interval: string,
    hours: number,
  ): Promise<Candle[]> {
    try {
      this.logger.log(
        `Fetching historical candles for ${tradingPair} with interval ${interval}`,
      );

      // Extract the unit (e.g., 'minute', 'hour') from the interval string
      // This is safe because the controller has already validated the full string
      const unit = interval.split(' ')[1];

      const candles = await this.prisma.$queryRaw<any[]>(
        Prisma.sql`
        SELECT DISTINCT
          date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt") AS candle_time,
          FIRST_VALUE(price) OVER w AS open,
          MAX(price) OVER w AS high,
          MIN(price) OVER w AS low,
          LAST_VALUE(price) OVER w AS close,
          SUM(quantity) OVER w as volume
        FROM "Trade"
        WHERE 
          "tradingPair" = ${tradingPair} AND
          "createdAt" >= NOW() - (${hours} * interval '1 hour')
        WINDOW w AS (
          PARTITION BY date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt")
          ORDER BY "createdAt" ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        )
        ORDER BY candle_time ASC;
      `,
      );

      const result = candles.map((c) => ({
        time: Math.floor(new Date(c.candle_time).getTime() / 1000),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
      }));

      this.logger.debug(
        `Retrieved ${result.length} historical candles for ${tradingPair}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch historical candles for ${tradingPair}:`,
        error,
      );
      throw error;
    }
  }
}
