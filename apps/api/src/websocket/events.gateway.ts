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
   * The trade should already include aggressorType from the matching engine.
   *
   * @param trade - Trade data to broadcast (should include aggressorType)
   */
  broadcastTrade(trade: Trade & { aggressorType?: 'BUY' | 'SELL' }): void {
    this.logger.debug(`Broadcasting new trade to room: ${trade.tradingPair}`);

    // The matching engine should always provide aggressorType
    if (!trade.aggressorType) {
      this.logger.warn(
        `Trade ${trade.id} missing aggressorType from matching engine - this should not happen`,
      );
      // Use default aggressor as fallback
      trade.aggressorType = 'BUY';
    }

    this.server.to(trade.tradingPair).emit('new_trade', trade);
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

  /**
   * Broadcasts order book updates to all clients subscribed to the trading pair.
   *
   * @param tradingPair - Trading pair identifier
   * @param orderBook - Updated order book data
   */
  broadcastOrderBookUpdate(
    tradingPair: string,
    orderBook: {
      bids: Array<{
        price: string;
        quantity: string;
        filledQuantity: string;
        status: string;
      }>;
      asks: Array<{
        price: string;
        quantity: string;
        filledQuantity: string;
        status: string;
      }>;
    },
  ): void {
    this.logger.debug(`Broadcasting order book update to room: ${tradingPair}`);
    this.server.to(tradingPair).emit('orderbook_update', orderBook);
  }
}
