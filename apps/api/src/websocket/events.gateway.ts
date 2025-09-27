import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Order, Trade } from '@prisma/client';
import { Server, Socket } from 'socket.io';

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
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

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
   *
   * @param trade - Trade data to broadcast
   */
  broadcastTrade(trade: Trade): void {
    this.logger.debug(`Broadcasting new trade to room: ${trade.tradingPair}`);
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
}
