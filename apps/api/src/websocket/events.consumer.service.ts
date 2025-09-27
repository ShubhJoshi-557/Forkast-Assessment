import { Injectable, OnModuleInit } from '@nestjs/common';
import { Order, Trade } from '@prisma/client';
import { Consumer, Kafka } from 'kafkajs';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsConsumerService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(private readonly eventsGateway: EventsGateway) {
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
      groupId: 'websocket-group',
      sessionTimeout: 60000, // Increased to 60 seconds
      heartbeatInterval: 10000, // Increased to 10 seconds
      rebalanceTimeout: 120000, // Increased to 2 minutes
      maxWaitTimeInMs: 5000, // Max wait time for batch
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'trades.executed' });
    await this.consumer.subscribe({ topic: 'orders.updated' });

    await this.consumer.run({
      partitionsConsumedConcurrently: 4,
      eachBatchAutoResolve: true,
      eachBatch: async ({
        batch,
        heartbeat,
      }: {
        batch: any;
        heartbeat: () => Promise<void>;
      }) => {
        let messageCount = 0;
        const trades: Trade[] = [];
        const orders: Order[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const message of batch.messages) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!message.value) continue;

          // Send heartbeat every 10 messages to prevent session timeout
          if (messageCount % 10 === 0) {
            await heartbeat();
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const payload: unknown = JSON.parse(message.value.toString());

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (batch.topic === 'trades.executed') {
            trades.push(payload as Trade);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          } else if (batch.topic === 'orders.updated') {
            orders.push(payload as Order);
          }

          messageCount++;
        }

        // Process all trades and orders in parallel
        const broadcastPromises: Promise<void>[] = [];

        for (const trade of trades) {
          broadcastPromises.push(
            Promise.resolve(this.eventsGateway.broadcastTrade(trade)),
          );
        }

        for (const order of orders) {
          broadcastPromises.push(
            Promise.resolve(this.eventsGateway.broadcastOrderUpdate(order)),
          );
        }

        // Execute all broadcasts in parallel
        await Promise.all(broadcastPromises);

        // Send final heartbeat after processing batch
        await heartbeat();
      },
    });
  }
}
