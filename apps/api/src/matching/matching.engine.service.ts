// explain this in detail and the bug it has:
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
    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 300,
    });
    this.consumer = this.kafka.consumer({
      groupId: 'matching-engine',
      sessionTimeout: 60000, // Increase to 60 seconds
      heartbeatInterval: 10000, // Increase to 10 seconds
      rebalanceTimeout: 120000, // Increase to 2 minutes
      maxWaitTimeInMs: 5000, // Add max wait time
      metadataMaxAge: 300000,
      maxBytesPerPartition: 1048576, // 1MB
      minBytes: 1,
      maxBytes: 10485760, // 10MB
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'orders.new' });

    await this.consumer.run({
      partitionsConsumedConcurrently: 8,
      eachBatchAutoResolve: true,
      eachBatch: async ({
        batch,
        heartbeat,
      }: {
        batch: any;
        heartbeat: () => Promise<void>;
      }) => {
        let messageCount = 0;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const message of batch.messages) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!message.value) continue;

          // Send heartbeat every 5 messages to prevent session timeout
          if (messageCount % 5 === 0) {
            await heartbeat();
          }

          const incomingOrder = JSON.parse(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            message.value.toString(),
          ) as NewOrderPayload;

          await this.processOrder(incomingOrder);
          messageCount++;
        }

        // Send final heartbeat after processing batch
        await heartbeat();
      },
    });
  }

  private async processOrder(order: NewOrderPayload) {
    try {
      console.log(
        `🔄 Processing order: ${order.id} (${order.type} ${order.quantity} @ ${order.price})`,
      );

      // Step 1: Create order (quick transaction)
      const newOrder = await this.createOrder(order);
      if (!newOrder) {
        console.log(`⚠️ Order ${order.id} already exists, skipping`);
        return; // Order already exists (idempotent)
      }

      console.log(`✅ Created order: ${newOrder.id}`);

      // Step 2: Find matching orders (optimized query)
      const matchingOrders = await this.findMatchingOrders(newOrder);
      console.log(
        `🔍 Found ${matchingOrders.length} matching orders for ${newOrder.id}`,
      );

      if (matchingOrders.length === 0) {
        // No matches, just publish the new order
        console.log(
          `📤 No matches found, publishing order update for ${newOrder.id}`,
        );
        await this.publishOrderUpdate(newOrder);
        return;
      }

      // Step 3: Process trades in smaller batches to avoid long transactions
      console.log(
        `⚡ Processing ${matchingOrders.length} matching orders in batches`,
      );
      const result = await this.processTradesInBatches(
        newOrder,
        matchingOrders,
      );
      console.log(
        `✅ Processed ${result.trades.length} trades for order ${newOrder.id}`,
      );

      // Step 4: Publish all events asynchronously (non-blocking)
      await this.publishEventsAsync(result);
      console.log(`📤 Published events for order ${newOrder.id}`);
    } catch (error) {
      console.error(`❌ Error processing order ${order.id}:`, error);
      throw error;
    }
  }

  private async createOrder(order: NewOrderPayload) {
    try {
      return await this.prisma.order.create({
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
    } catch (err: unknown) {
      // P2002: Unique constraint violation -> order already created; skip re-processing
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'P2002'
      ) {
        return null; // Idempotent no-op
      }
      throw err;
    }
  }

  private async findMatchingOrders(newOrder: {
    tradingPair: string;
    type: OrderType;
    price: Prisma.Decimal;
  }) {
    return await this.prisma.order.findMany({
      where: {
        tradingPair: newOrder.tradingPair,
        type: newOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
        status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
        price:
          newOrder.type === OrderType.BUY
            ? { lte: newOrder.price }
            : { gte: newOrder.price },
      },
      orderBy: [
        { price: newOrder.type === OrderType.BUY ? 'asc' : 'desc' },
        { createdAt: 'asc' },
      ], // Limit to prevent excessive processing
    });
  }

  private async processTradesInBatches(
    newOrder: {
      id: string;
      tradingPair: string;
      type: OrderType;
      quantity: Prisma.Decimal;
    },
    matchingOrders: Array<{
      id: string;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      price: Prisma.Decimal;
    }>,
  ) {
    const trades: Array<{
      id: string;
      tradingPair: string;
      buyOrderId: string;
      sellOrderId: string;
      quantity: Prisma.Decimal;
      price: Prisma.Decimal;
      createdAt: Date;
    }> = [];
    const orderUpdates: Array<{
      id: string;
      userId: number;
      tradingPair: string;
      type: OrderType;
      status: OrderStatus;
      price: Prisma.Decimal;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    let remainingQuantity = newOrder.quantity;

    // Process in batches of 10 orders to avoid long transactions
    const batchSize = 10;
    for (
      let i = 0;
      i < matchingOrders.length && !remainingQuantity.isZero();
      i += batchSize
    ) {
      const batch = matchingOrders.slice(i, i + batchSize);

      const batchResult = await this.prisma.$transaction(async (tx) => {
        const batchTrades: Array<{
          id: string;
          tradingPair: string;
          buyOrderId: string;
          sellOrderId: string;
          quantity: Prisma.Decimal;
          price: Prisma.Decimal;
          createdAt: Date;
        }> = [];
        const batchUpdates: Array<{
          id: string;
          userId: number;
          tradingPair: string;
          type: OrderType;
          status: OrderStatus;
          price: Prisma.Decimal;
          quantity: Prisma.Decimal;
          filledQuantity: Prisma.Decimal;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        let batchRemaining = remainingQuantity;

        for (const opposingOrder of batch) {
          if (batchRemaining.isZero()) break;

          const availableQuantity = opposingOrder.quantity.minus(
            opposingOrder.filledQuantity,
          );

          if (availableQuantity.isZero()) {
            console.log(
              `⚠️ Order ${opposingOrder.id} has no available quantity, skipping`,
            );
            continue;
          }

          const tradeQuantity = Decimal.min(batchRemaining, availableQuantity);
          console.log(
            `💱 Creating trade: ${tradeQuantity.toString()} @ ${opposingOrder.price.toString()} between ${newOrder.id} and ${opposingOrder.id}`,
          );

          // Create trade
          const trade = await tx.trade.create({
            data: {
              tradingPair: newOrder.tradingPair,
              buyOrderId:
                newOrder.type === OrderType.BUY
                  ? newOrder.id
                  : opposingOrder.id,
              sellOrderId:
                newOrder.type === OrderType.SELL
                  ? newOrder.id
                  : opposingOrder.id,
              quantity: tradeQuantity,
              price: opposingOrder.price,
            },
          });

          // Update orders
          const newOrderUpdate = await this.updateOrderFillInTransaction(
            tx,
            newOrder.id,
            tradeQuantity,
          );
          const opposingOrderUpdate = await this.updateOrderFillInTransaction(
            tx,
            opposingOrder.id,
            tradeQuantity,
          );

          if (newOrderUpdate) batchUpdates.push(newOrderUpdate);
          if (opposingOrderUpdate) batchUpdates.push(opposingOrderUpdate);
          batchTrades.push(trade);

          batchRemaining = batchRemaining.minus(tradeQuantity);
          console.log(`📊 Remaining quantity: ${batchRemaining.toString()}`);
        }

        return { batchTrades, batchUpdates, batchRemaining };
      });

      trades.push(...batchResult.batchTrades);
      orderUpdates.push(...batchResult.batchUpdates);
      remainingQuantity = batchResult.batchRemaining;
    }

    return {
      newOrder,
      trades,
      orderUpdates,
    };
  }

  private async publishEventsAsync(result: {
    newOrder: {
      id: string;
      tradingPair: string;
    };
    trades: Array<{
      id: string;
      tradingPair: string;
      buyOrderId: string;
      sellOrderId: string;
      quantity: Prisma.Decimal;
      price: Prisma.Decimal;
      createdAt: Date;
    }>;
    orderUpdates: Array<{
      id: string;
      userId: number;
      tradingPair: string;
      type: OrderType;
      status: OrderStatus;
      price: Prisma.Decimal;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }) {
    // Publish all events asynchronously to avoid blocking
    const publishPromises: Promise<any>[] = [];

    // Initial order update
    publishPromises.push(
      this.kafkaProducer.produce({
        topic: 'orders.updated',
        messages: [
          { key: result.newOrder.id, value: JSON.stringify(result.newOrder) },
        ],
      }),
    );

    // Trade executions
    for (const trade of result.trades) {
      publishPromises.push(
        this.kafkaProducer.produce({
          topic: 'trades.executed',
          messages: [{ key: trade.tradingPair, value: JSON.stringify(trade) }],
        }),
      );
    }

    // Order updates
    for (const orderUpdate of result.orderUpdates) {
      publishPromises.push(
        this.kafkaProducer.produce({
          topic: 'orders.updated',
          messages: [
            { key: orderUpdate.id, value: JSON.stringify(orderUpdate) },
          ],
        }),
      );
    }

    // Execute all publishes in parallel
    await Promise.all(publishPromises);
  }

  private async publishOrderUpdate(order: { id: string }) {
    await this.kafkaProducer.produce({
      topic: 'orders.updated',
      messages: [{ key: order.id, value: JSON.stringify(order) }],
    });
  }

  private async updateOrderFillInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    quantity: Decimal,
  ) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    const newFilledQuantity = order.filledQuantity.add(quantity);
    let newStatus = order.status;

    if (newFilledQuantity.gte(order.quantity)) {
      newStatus = OrderStatus.FILLED;
    } else if (newFilledQuantity.gt(0)) {
      newStatus = OrderStatus.PARTIALLY_FILLED;
    } else {
      newStatus = order.status; // Keep existing status if no fill
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        filledQuantity: newFilledQuantity,
        status: newStatus,
      },
    });

    return updatedOrder;
  }
}
