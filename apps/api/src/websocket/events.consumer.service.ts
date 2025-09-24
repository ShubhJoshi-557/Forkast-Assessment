/* eslint-disable @typescript-eslint/require-await */
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
    this.kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER_URL] });
    this.consumer = this.kafka.consumer({ groupId: 'websocket-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'trades.executed' });
    await this.consumer.subscribe({ topic: 'orders.updated' });

    await this.consumer.run({
      // FIX 1: Added 'async' back to satisfy the 'EachMessageHandler' type
      eachMessage: async ({ topic, message }) => {
        if (!message.value) {
          return;
        }

        // FIX 2: Parse into an 'unknown' type for improved safety
        const payload: unknown = JSON.parse(message.value.toString());

        if (topic === 'trades.executed') {
          // Assert the type from 'unknown' before passing to the gateway
          this.eventsGateway.broadcastTrade(payload as Trade);
        } else if (topic === 'orders.updated') {
          // Assert the type from 'unknown' before passing to the gateway
          this.eventsGateway.broadcastOrderUpdate(payload as Order);
        }
      },
    });
  }
}
