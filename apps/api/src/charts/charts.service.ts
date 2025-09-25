/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';

// @Injectable()
// export class ChartsService {
//   constructor(private prisma: PrismaService) {}

//   async getCandles(tradingPair: string) {
//     // This raw SQL query aggregates trades into 1-minute candles (OHLCV).
//     const candles = await this.prisma.$queryRaw`
//       SELECT
//         (floor(extract(epoch from "createdAt") / 60)) * 60 AS "time",
//         (array_agg(price ORDER BY "createdAt" ASC))[1] AS "open",
//         max(price) AS "high",
//         min(price) AS "low",
//         (array_agg(price ORDER BY "createdAt" DESC))[1] AS "close",
//         sum(quantity) AS "volume"
//       FROM
//         "Trade"
//       WHERE
//         "tradingPair" = ${tradingPair}
//       GROUP BY
//         1
//       ORDER BY
//         1 ASC;
//     `;
//     return candles;
//   }
// }
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnModuleInit } from '@nestjs/common';
import { Trade } from '@prisma/client';
import { Consumer, Kafka } from 'kafkajs';
import { EventsGateway } from '../websocket/events.gateway';

export type Candle = {
  time: number; // UNIX timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

@Injectable()
export class ChartsService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  // In-memory store for the current, real-time candles for each trading pair.
  private readonly liveCandles = new Map<string, Candle>();

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway, // Inject the WebSocket gateway
  ) {
    this.kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER_URL!] });
    this.consumer = this.kafka.consumer({ groupId: 'charts-group' });
  }

  // This method runs when the module is initialized.
  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'trades.executed',
      fromBeginning: false,
    });

    await this.consumer.run({
      // eslint-disable-next-line @typescript-eslint/require-await
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const trade = JSON.parse(message.value.toString()) as Trade;
        this.aggregateTradeToCandle(trade);
      },
    });
  }

  private aggregateTradeToCandle(trade: Trade) {
    const tradePrice = parseFloat(trade.price.toString());
    const tradeQuantity = parseFloat(trade.quantity.toString());
    const tradeTime = new Date(trade.createdAt).getTime();

    // Get the timestamp for the start of the current minute.
    const candleTime = Math.floor(tradeTime / 60000) * 60; // In seconds

    const existingCandle = this.liveCandles.get(trade.tradingPair);

    if (existingCandle && existingCandle.time === candleTime) {
      // --- Update the existing candle for this minute ---
      existingCandle.high = Math.max(existingCandle.high, tradePrice);
      existingCandle.low = Math.min(existingCandle.low, tradePrice);
      existingCandle.close = tradePrice; // The latest trade sets the close price
      existingCandle.volume += tradeQuantity;
      this.liveCandles.set(trade.tradingPair, existingCandle);
    } else {
      // --- This is the first trade of a new minute, create a new candle ---
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

    // Broadcast the updated candle to all subscribed clients.
    const latestCandle = this.liveCandles.get(trade.tradingPair)!;
    console.log(
      `Broadcasting candle_update for ${trade.tradingPair}:`,
      latestCandle,
    );
    this.eventsGateway.server
      .to(trade.tradingPair)
      .emit('candle_update', latestCandle);
  }

  async getHistoricalCandles(
    tradingPair: string,
    interval: string,
    hours: number,
  ): Promise<Candle[]> {
    const candles = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT
        date_trunc('minute', "createdAt") AS candle_time,
        FIRST_VALUE(price) OVER w AS open,
        MAX(price) OVER w AS high,
        MIN(price) OVER w AS low,
        LAST_VALUE(price) OVER w AS close,
        SUM(quantity) OVER w as volume
      FROM "Trade"
      WHERE 
        "tradingPair" = ${tradingPair} AND
        -- FINAL FIX: This is the simplest and most compatible way to subtract hours.
        "createdAt" >= NOW() - (${hours} * interval '1 hour')
      WINDOW w AS (
        PARTITION BY date_trunc('minute', "createdAt")
        ORDER BY "createdAt" ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      )
      ORDER BY candle_time ASC;
    `;

    return candles.map((c) => ({
      time: Math.floor(new Date(c.candle_time).getTime() / 1000),
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume),
    }));
  }
}
