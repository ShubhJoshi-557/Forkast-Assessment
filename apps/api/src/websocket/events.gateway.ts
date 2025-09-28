import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Order, Trade } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

/**
 * EventsGateway handles WebSocket connections and real-time event broadcasting.
 *
 * This gateway manages:
 * - Client connections and room subscriptions
 * - Real-time trade broadcasts
 * - Order update notifications
 * - Room-based message routing for trading pairs
 *
 * Clients can subscribe to specific trading pairs to receive real-time updates.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handles client subscription to a trading pair room.
   *
   * @param client - WebSocket client connection
   * @param payload - Subscription payload containing room name (trading pair)
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ): void {
    if (payload && payload.room) {
      this.logger.log(
        `Client ${client.id} subscribing to room: ${payload.room}`,
      );
      void client.join(payload.room);
    } else {
      this.logger.warn(
        `Client ${client.id} sent an invalid subscribe payload.`,
      );
    }
  }

  /**
   * Handles client unsubscription from a trading pair room.
   *
   * @param client - WebSocket client connection
   * @param payload - Unsubscription payload containing room name (trading pair)
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ): void {
    if (payload && payload.room) {
      this.logger.log(
        `Client ${client.id} unsubscribing from room: ${payload.room}`,
      );
      void client.leave(payload.room);
    }
  }

  /**
   * Broadcasts a new trade to all clients subscribed to the trading pair.
   * Includes aggressorType calculation for proper trade history coloring.
   *
   * @param trade - Trade data to broadcast
   */
  broadcastTrade(trade: Trade): void {
    this.logger.debug(`Broadcasting new trade to room: ${trade.tradingPair}`);

    // Calculate aggressorType for trade history coloring
    // The aggressor is the order that crossed the spread (placed later)
    // We need to fetch the order details to compare timestamps
    void this.calculateAndBroadcastTrade(trade);
  }

  /**
   * Calculates aggressorType and broadcasts the trade with proper formatting.
   *
   * @param trade - Raw trade data from database
   */
  private async calculateAndBroadcastTrade(trade: Trade): Promise<void> {
    try {
      // Fetch order details to compare timestamps and determine aggressor
      const [buyOrder, sellOrder] = await Promise.all([
        this.prisma.order.findUnique({
          where: { id: trade.buyOrderId },
          select: { type: true, createdAt: true },
        }),
        this.prisma.order.findUnique({
          where: { id: trade.sellOrderId },
          select: { type: true, createdAt: true },
        }),
      ]);

      if (!buyOrder || !sellOrder) {
        this.logger.warn(
          'Could not fetch order details for trade, using default',
        );
        const tradeWithAggressor = {
          ...trade,
          aggressorType: 'BUY' as const,
        };
        this.server.to(trade.tradingPair).emit('new_trade', tradeWithAggressor);
        return;
      }

      // Compare order timestamps to determine which order was the aggressor
      // The order placed later is the aggressor (the one that crossed the spread)
      const buyOrderTime = new Date(buyOrder.createdAt).getTime();
      const sellOrderTime = new Date(sellOrder.createdAt).getTime();

      const aggressorType =
        buyOrderTime > sellOrderTime ? buyOrder.type : sellOrder.type;

      const tradeWithAggressor = {
        ...trade,
        aggressorType,
      };

      this.server.to(trade.tradingPair).emit('new_trade', tradeWithAggressor);
    } catch (error) {
      this.logger.error('Failed to calculate aggressorType for trade:', error);
      // Fallback to original trade data
      this.server.to(trade.tradingPair).emit('new_trade', trade);
    }
  }

  /**
   * Broadcasts an order update to all clients subscribed to the trading pair.
   *
   * @param order - Order data to broadcast
   */
  broadcastOrderUpdate(order: Order): void {
    this.logger.debug(
      `Broadcasting order update to room: ${order.tradingPair}`,
    );
    this.server.to(order.tradingPair).emit('order_update', order);
  }
}
