/* eslint-disable @typescript-eslint/no-unused-vars */
// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { OrderStatus, OrderType, Prisma } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';
// import { Consumer, Kafka } from 'kafkajs';
// import { KafkaProducerService } from '../kafka/kafka.producer.service';
// import { PrismaService } from '../prisma/prisma.service';

// // 1. Define a specific type for the payload coming from Kafka.
// type NewOrderPayload = {
//   id: string;
//   userId: number;
//   type: OrderType;
//   price: number;
//   quantity: number;
// };

// @Injectable()
// export class MatchingEngineService implements OnModuleInit {
//   private readonly kafka: Kafka; // Declare here
//   private readonly consumer: Consumer;

//   constructor(
//     private prisma: PrismaService,
//     private kafkaProducer: KafkaProducerService,
//   ) {
//     // 1. Validate the environment variable
//     if (!process.env.KAFKA_BROKER_URL) {
//       throw new Error(
//         'KAFKA_BROKER_URL is not defined in the environment variables.',
//       );
//     }

//     // 2. Initialize Kafka now that the variable is guaranteed to be a string
//     this.kafka = new Kafka({
//       brokers: [process.env.KAFKA_BROKER_URL], // No more error!
//     });

//     this.consumer = this.kafka.consumer({ groupId: 'matching-engine' });
//   }

//   async onModuleInit() {
//     await this.consumer.connect();
//     await this.consumer.subscribe({ topic: 'orders.new', fromBeginning: true });

//     await this.consumer.run({
//       eachMessage: async ({ _topic, _partition, message }) => {
//         // 2. Use a type assertion (`as`) to cast the result of JSON.parse.
//         // This tells TypeScript: "I guarantee this object has the shape of NewOrderPayload".
//         const incomingOrder = JSON.parse(
//           message.value.toString(),
//         ) as NewOrderPayload;

//         await this.processOrder(incomingOrder);
//       },
//     });
//   }

//   // 3. Update the method signature to accept the specific type, not `any`.
//   private async processOrder(order: NewOrderPayload) {
//     // Wrap the entire matching process in a transaction
//     await this.prisma.$transaction(async (tx) => {
//       // Create the incoming order in the DB
//       const newOrder = await tx.order.create({
//         data: {
//           id: order.id,
//           userId: order.userId,
//           type: order.type,
//           status: OrderStatus.OPEN,
//           price: new Prisma.Decimal(order.price),
//           quantity: new Prisma.Decimal(order.quantity),
//           filledQuantity: new Prisma.Decimal(0),
//         },
//       });

//       let remainingQuantity = newOrder.quantity;

//       // Find opposing orders to match against
//       const opposingOrders = await tx.order.findMany({
//         where: {
//           type:
//             newOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
//           status: { in: [OrderStatus.OPEN, OrderStatus.PARTIAL_FILLED] },
//           price:
//             newOrder.type === OrderType.BUY
//               ? { lte: newOrder.price }
//               : { gte: newOrder.price },
//         },
//         orderBy: [
//           { price: newOrder.type === OrderType.BUY ? 'asc' : 'desc' },
//           { createdAt: 'asc' },
//         ],
//       });

//       // Iterate and create trades
//       for (const opposingOrder of opposingOrders) {
//         if (remainingQuantity.isZero()) break;

//         const availableQuantity = opposingOrder.quantity.minus(
//           opposingOrder.filledQuantity,
//         );
//         const tradeQuantity = Decimal.min(remainingQuantity, availableQuantity);

//         const trade = await tx.trade.create({
//           data: {
//             buyOrderId:
//               newOrder.type === OrderType.BUY ? newOrder.id : opposingOrder.id,
//             sellOrderId:
//               newOrder.type === OrderType.SELL ? newOrder.id : opposingOrder.id,
//             quantity: tradeQuantity,
//             price: opposingOrder.price,
//           },
//         });

//         // Update filled quantities on both orders
//         await this.updateOrderFill(tx, newOrder.id, tradeQuantity);
//         await this.updateOrderFill(tx, opposingOrder.id, tradeQuantity);

//         remainingQuantity = remainingQuantity.minus(tradeQuantity);

//         await this.kafkaProducer.produce({
//           topic: 'trades.executed',
//           messages: [{ value: JSON.stringify(trade) }],
//         });
//       }
//     });
//   }

//   private async updateOrderFill(
//     tx: Prisma.TransactionClient,
//     orderId: string,
//     quantity: Decimal,
//   ) {
//     const order = await tx.order.findUnique({ where: { id: orderId } });
//     if (!order) return;

//     const newFilledQuantity = order.filledQuantity.add(quantity);
//     let newStatus = order.status;

//     if (newFilledQuantity.gte(order.quantity)) {
//       newStatus = OrderStatus.FILLED;
//     } else {
//       newStatus = OrderStatus.PARTIAL_FILLED;
//     }

//     const updatedOrder = await tx.order.update({
//       where: { id: orderId },
//       data: {
//         filledQuantity: newFilledQuantity,
//         status: newStatus,
//       },
//     });

//     await this.kafkaProducer.produce({
//       topic: 'orders.updated',
//       messages: [{ key: orderId, value: JSON.stringify(updatedOrder) }],
//     });
//   }
// }

import { Injectable, OnModuleInit } from '@nestjs/common';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Consumer, Kafka } from 'kafkajs';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { PrismaService } from '../prisma/prisma.service';

type NewOrderPayload = {
  id: string;
  userId: number;
  type: OrderType;
  price: number;
  quantity: number;
};

@Injectable()
export class MatchingEngineService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(
    private prisma: PrismaService,
    private kafkaProducer: KafkaProducerService,
  ) {
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables.',
      );
    }
    this.kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER_URL] });
    this.consumer = this.kafka.consumer({ groupId: 'matching-engine' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'orders.new', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({
        topic: _topic,
        partition: _partition,
        message,
      }) => {
        // FIX 2: Handle null message value
        if (!message.value) {
          return;
        }

        const incomingOrder = JSON.parse(
          message.value.toString(),
        ) as NewOrderPayload;

        await this.processOrder(incomingOrder);
      },
    });
  }

  private async processOrder(order: NewOrderPayload) {
    await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id: order.id,
          userId: order.userId,
          type: order.type,
          status: OrderStatus.OPEN,
          price: new Prisma.Decimal(order.price),
          quantity: new Prisma.Decimal(order.quantity),
          filledQuantity: new Prisma.Decimal(0),
        },
      });

      let remainingQuantity = newOrder.quantity;

      const opposingOrders = await tx.order.findMany({
        where: {
          type:
            newOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
          // FIX 3: Corrected typo from PARTIAL_FILLED
          status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
          price:
            newOrder.type === OrderType.BUY
              ? { lte: newOrder.price }
              : { gte: newOrder.price },
        },
        orderBy: [
          { price: newOrder.type === OrderType.BUY ? 'asc' : 'desc' },
          { createdAt: 'asc' },
        ],
      });

      for (const opposingOrder of opposingOrders) {
        if (remainingQuantity.isZero()) break;

        const availableQuantity = opposingOrder.quantity.minus(
          opposingOrder.filledQuantity,
        );
        const tradeQuantity = Decimal.min(remainingQuantity, availableQuantity);

        const trade = await tx.trade.create({
          data: {
            buyOrderId:
              newOrder.type === OrderType.BUY ? newOrder.id : opposingOrder.id,
            sellOrderId:
              newOrder.type === OrderType.SELL ? newOrder.id : opposingOrder.id,
            quantity: tradeQuantity,
            price: opposingOrder.price,
          },
        });

        // Update filled quantities on both orders
        await this.updateOrderFill(tx, newOrder.id, tradeQuantity);
        await this.updateOrderFill(tx, opposingOrder.id, tradeQuantity);

        remainingQuantity = remainingQuantity.minus(tradeQuantity);

        await this.kafkaProducer.produce({
          topic: 'trades.executed',
          messages: [{ value: JSON.stringify(trade) }],
        });
      }
    });
  }
  private async updateOrderFill(
    tx: Prisma.TransactionClient,
    orderId: string,
    quantity: Decimal,
  ) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const newFilledQuantity = order.filledQuantity.add(quantity);
    let newStatus = order.status;

    if (newFilledQuantity.gte(order.quantity)) {
      newStatus = OrderStatus.FILLED;
    } else {
      newStatus = OrderStatus.PARTIALLY_FILLED;
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        filledQuantity: newFilledQuantity,
        status: newStatus,
      },
    });

    await this.kafkaProducer.produce({
      topic: 'orders.updated',
      messages: [{ key: orderId, value: JSON.stringify(updatedOrder) }],
    });
  }
}
