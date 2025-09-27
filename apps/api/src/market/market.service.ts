import { Injectable } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getRecentTrades(tradingPair: string) {
    return this.prisma.trade.findMany({
      where: { tradingPair },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // UPDATED: Added the tradingPair parameter to the method signature
  async getOrderBook(tradingPair: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        tradingPair, // Now this correctly filters by the provided parameter
        status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
      },
      orderBy: { price: 'desc' },
    });

    const bids = orders
      .filter((o) => o.type === OrderType.BUY)
      .map((o) => ({
        price: o.price.toString(),
        quantity: o.quantity.minus(o.filledQuantity).toString(),
        filledQuantity: o.filledQuantity.toString(),
        status: o.status, // Add order status for frontend visualization
      }));

    const asks = orders
      .filter((o) => o.type === OrderType.SELL)
      .sort((a, b) => a.price.comparedTo(b.price))
      .map((o) => ({
        price: o.price.toString(),
        quantity: o.quantity.minus(o.filledQuantity).toString(),
        filledQuantity: o.filledQuantity.toString(),
        status: o.status, // Add order status for frontend visualization
      }));

    return { bids, asks };
  }
}
