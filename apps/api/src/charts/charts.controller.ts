import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import { ChartsService } from './charts.service';

/**
 * Allowed time intervals for candlestick data to prevent SQL injection.
 * These intervals are validated against user input to ensure security.
 */
const ALLOWED_INTERVALS = ['10 second', '1 minute', '1 hour', '1 day'] as const;

/**
 * ChartsController handles HTTP requests for historical market data.
 *
 * This controller provides endpoints for:
 * - Historical candlestick data (OHLCV)
 * - Different time intervals for charting
 *
 * All data is validated and sanitized to prevent SQL injection attacks.
 */
@Controller('charts')
export class ChartsController {
  private readonly logger = new Logger(ChartsController.name);

  constructor(private readonly chartsService: ChartsService) {}

  /**
   * Retrieves historical candlestick data for a specific trading pair.
   *
   * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
   * @param interval - Time interval for candles (10 second, 1 minute, 1 hour, 1 day)
   * @returns Array of candlestick data (OHLCV)
   *
   * @example
   * GET /charts/BTC-USD/candles?interval=1 minute
   */
  @Get(':tradingPair/candles')
  async getCandles(
    @Param('tradingPair') tradingPair: string,
    @Query('interval') interval = '1 minute',
  ) {
    const normalizedPair = tradingPair.toUpperCase();

    // Validate interval parameter to prevent SQL injection
    if (!ALLOWED_INTERVALS.includes(interval as any)) {
      throw new BadRequestException(
        `Invalid interval parameter. Allowed values: ${ALLOWED_INTERVALS.join(', ')}`,
      );
    }

    this.logger.log(
      `Fetching candlestick data for ${normalizedPair} with interval ${interval}`,
    );

    try {
      // Calculate appropriate time range based on interval
      const hours = this.calculateTimeRange(interval);

      const candles = await this.chartsService.getHistoricalCandles(
        normalizedPair,
        interval,
        hours,
      );

      this.logger.debug(
        `Retrieved ${candles.length} candles for ${normalizedPair}`,
      );
      return candles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch candlestick data for ${normalizedPair}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculates the appropriate time range in hours based on the interval.
   *
   * @param interval - Time interval for candles
   * @returns Number of hours to fetch data for
   */
  private calculateTimeRange(interval: string): number {
    if (interval.includes('day')) {
      return 30 * 24; // 30 days for daily candles
    } else if (interval.includes('hour')) {
      return 7 * 24; // 7 days for hourly candles
    } else if (interval.includes('minute')) {
      return 24; // 1 day for minute candles
    } else {
      return 1; // 1 hour for second candles
    }
  }
}
