import { Injectable } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getRecentTrades() {
    return this.prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // Get the last 50 trades
    });
  }

  async getOrderBook() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
      },
      orderBy: { price: 'desc' },
    });

    const bids = orders
      .filter((o) => o.type === OrderType.BUY)
      .map((o) => ({
        price: o.price.toString(),
        quantity: o.quantity.minus(o.filledQuantity).toString(),
      }));

    const asks = orders
      .filter((o) => o.type === OrderType.SELL)
      .sort((a, b) => a.price.comparedTo(b.price)) // Sort asks ascending
      .map((o) => ({
        price: o.price.toString(),
        quantity: o.quantity.minus(o.filledQuantity).toString(),
      }));

    return { bids, asks };
  }
}
