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

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string }, // 2. Add the decorator here
  ) {
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

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string }, // 3. Add the decorator here too
  ) {
    if (payload && payload.room) {
      this.logger.log(
        `Client ${client.id} unsubscribing from room: ${payload.room}`,
      );
      void client.leave(payload.room);
    }
  }

  broadcastTrade(trade: Trade) {
    this.logger.log(
      `Attempting to broadcast 'new_trade' to room: >> ${trade.tradingPair} <<`,
    );
    this.server.to(trade.tradingPair).emit('new_trade', trade);
  }

  broadcastOrderUpdate(order: Order) {
    this.logger.log(
      `Attempting to broadcast 'order_update' to room: >> ${order.tradingPair} <<`,
    );
    this.server.to(order.tradingPair).emit('order_update', order);
  }
}
