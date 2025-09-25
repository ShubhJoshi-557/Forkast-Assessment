import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private kafkaProducer: KafkaProducerService) {}

  async createOrder(data: CreateOrderDto) {
    const orderId = uuidv4();

    const orderPayload = {
      id: orderId,
      ...data, // This now includes tradingPair from the DTO
    };

    await this.kafkaProducer.produce({
      topic: 'orders.new',
      // Use the tradingPair as the key for partitioning
      messages: [
        { key: data.tradingPair, value: JSON.stringify(orderPayload) },
      ],
    });

    return { message: 'Order submitted successfully', orderId };
  }
}
// @Injectable()
// export class OrdersService {
//   constructor(
//     private prisma: PrismaService,
//     private kafkaProducer: KafkaProducerService,
//   ) {}

//   async createOrder(data: CreateOrderDto) {
//     const orderId = uuidv4();

//     // We can create the order in the DB first with an 'PENDING' status,
//     // or let the matching engine create it. Let's let the engine do it
//     // to ensure the DB reflects the state of the consumed message.

//     const orderPayload = {
//       id: orderId,
//       ...data,
//       status: OrderStatus.OPEN, // The matching engine will process from this state
//     };

//     await this.kafkaProducer.produce({
//       topic: 'orders.new',
//       messages: [{ key: orderId, value: JSON.stringify(orderPayload) }],
//     });

//     return { message: 'Order submitted successfully', orderId };
//   }
// }
