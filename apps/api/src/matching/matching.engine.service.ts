/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Consumer, Kafka } from 'kafkajs';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { PrismaService } from '../prisma/prisma.service';

// UPDATED: Added tradingPair to the payload type
type NewOrderPayload = {
  id: string;
  userId: number;
  tradingPair: string;
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
          tradingPair: order.tradingPair,
          type: order.type,
          status: OrderStatus.OPEN,
          price: new Prisma.Decimal(order.price),
          quantity: new Prisma.Decimal(order.quantity),
          filledQuantity: new Prisma.Decimal(0),
        },
      });

      await this.kafkaProducer.produce({
        topic: 'orders.updated',
        messages: [{ key: newOrder.id, value: JSON.stringify(newOrder) }],
      });

      let remainingQuantity = newOrder.quantity;

      const opposingOrders = await tx.order.findMany({
        where: {
          tradingPair: newOrder.tradingPair,
          type:
            newOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
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
            tradingPair: newOrder.tradingPair, // NEW: Save tradingPair
            buyOrderId:
              newOrder.type === OrderType.BUY ? newOrder.id : opposingOrder.id,
            sellOrderId:
              newOrder.type === OrderType.SELL ? newOrder.id : opposingOrder.id,
            quantity: tradeQuantity,
            price: opposingOrder.price,
          },
        });

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
