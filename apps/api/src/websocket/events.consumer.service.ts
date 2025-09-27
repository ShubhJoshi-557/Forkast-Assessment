import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Order, Trade } from '@prisma/client';
import { Consumer, Kafka } from 'kafkajs';
import { EventsGateway } from './events.gateway';

/**
 * EventsConsumerService handles Kafka message consumption for real-time WebSocket broadcasting.
 *
 * This service:
 * - Consumes trade and order update events from Kafka
 * - Broadcasts real-time updates to connected WebSocket clients
 * - Handles batch processing for optimal performance
 * - Manages consumer group coordination and heartbeat
 */
@Injectable()
export class EventsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(EventsConsumerService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(private readonly eventsGateway: EventsGateway) {
    // Validate required environment variables
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables.',
      );
    }

    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'websocket-group',
      sessionTimeout: 60000, // 60 seconds
      heartbeatInterval: 10000, // 10 seconds
      rebalanceTimeout: 120000, // 2 minutes
      maxWaitTimeInMs: 5000, // Max wait time for batch collection
      metadataMaxAge: 300000, // 5 minute metadata cache
    });
  }

  /**
   * Initializes the events consumer service by connecting to Kafka and starting message consumption.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing events consumer service...');

      await this.consumer.connect();
      this.logger.log('Connected to Kafka for events consumer');

      await this.consumer.subscribe({ topic: 'trades.executed' });
      await this.consumer.subscribe({ topic: 'orders.updated' });
      this.logger.log(
        'Subscribed to trades.executed and orders.updated topics',
      );

      await this.consumer.run({
        partitionsConsumedConcurrently: 4,
        eachBatchAutoResolve: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        eachBatch: this.handleBatch.bind(this),
      });

      this.logger.log('Events consumer service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize events consumer service:', error);
      throw error;
    }
  }

  /**
   * Handles a batch of messages from Kafka for WebSocket broadcasting.
   *
   * @param batch - Kafka message batch
   * @param heartbeat - Function to send heartbeat to Kafka
   */
  private async handleBatch({
    batch,
    heartbeat,
  }: {
    batch: any;
    heartbeat: () => Promise<void>;
  }): Promise<void> {
    let messageCount = 0;
    const trades: Trade[] = [];
    const orders: Order[] = [];

    try {
      // Process each message in the batch
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const message of batch.messages) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!message.value) {
          this.logger.warn('Received message with no value, skipping');
          continue;
        }

        // Send heartbeat every 10 messages to prevent session timeout
        if (messageCount % 10 === 0) {
          await heartbeat();
        }

        // Parse the message payload
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const payload: unknown = JSON.parse(message.value.toString());

        // Route messages to appropriate arrays based on topic
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

      this.logger.debug(
        `Processed batch: ${trades.length} trades, ${orders.length} orders`,
      );
    } catch (error) {
      this.logger.error('Error processing events batch:', error);
      throw error;
    }
  }
}
