import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChartsService {
  constructor(private prisma: PrismaService) {}

  async getCandles(tradingPair: string) {
    // This raw SQL query aggregates trades into 1-minute candles (OHLCV).
    const candles = await this.prisma.$queryRaw`
      SELECT
        (floor(extract(epoch from "createdAt") / 60)) * 60 AS "time",
        (array_agg(price ORDER BY "createdAt" ASC))[1] AS "open",
        max(price) AS "high",
        min(price) AS "low",
        (array_agg(price ORDER BY "createdAt" DESC))[1] AS "close",
        sum(quantity) AS "volume"
      FROM
        "Trade"
      WHERE
        "tradingPair" = ${tradingPair}
      GROUP BY
        1
      ORDER BY
        1 ASC;
    `;
    return candles;
  }
}
