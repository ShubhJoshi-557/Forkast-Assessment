import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Order, Trade } from '@prisma/client'; // Import types from Prisma
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  // Method for other services to call to broadcast a trade
  broadcastTrade(trade: Trade) {
    // Use the specific 'Trade' type
    this.server.emit('new_trade', trade);
  }

  // Method for other services to call to broadcast an order book update
  broadcastOrderUpdate(order: Order) {
    // Use the specific 'Order' type
    this.server.emit('order_update', order);
  }
}
