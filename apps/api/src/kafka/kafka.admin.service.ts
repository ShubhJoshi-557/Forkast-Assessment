import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';

/**
 * KafkaAdminService handles Kafka topic creation and management.
 *
 * This service is responsible for:
 * - Creating required Kafka topics on startup
 * - Managing topic configurations
 * - Ensuring proper topic partitioning for performance
 *
 * Topics created:
 * - orders.new: 8 partitions for order processing
 * - orders.updated: 4 partitions for order updates
 * - trades.executed: 4 partitions for trade executions
 */
@Injectable()
export class KafkaAdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaAdminService.name);
  private readonly kafka: Kafka;
  private readonly admin: Admin;

  constructor() {
    // Validate required environment variables
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables.',
      );
    }

    // Initialize Kafka client
    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 30000,
    });

    this.admin = this.kafka.admin();
  }

  /**
   * Initializes the Kafka admin service and creates required topics.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Connecting to Kafka admin...');
      await this.admin.connect();
      await this.createTopics();
      this.logger.log('Kafka admin service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka admin service:', error);
      throw error;
    }
  }

  /**
   * Creates all required Kafka topics with optimized configurations.
   *
   * Topic configurations are optimized for:
   * - High throughput order processing
   * - Real-time event streaming
   * - Horizontal scaling
   */
  private async createTopics(): Promise<void> {
    const topics = [
      {
        topic: 'orders.new',
        numPartitions: 8, // Match consumer concurrency for high throughput
        replicationFactor: 1,
      },
      {
        topic: 'orders.updated',
        numPartitions: 4, // Match websocket consumer concurrency
        replicationFactor: 1,
      },
      {
        topic: 'trades.executed',
        numPartitions: 4, // Match websocket consumer concurrency
        replicationFactor: 1,
      },
    ];

    try {
      await this.admin.createTopics({
        topics,
        waitForLeaders: true,
      });
      this.logger.log('Kafka topics created successfully');
    } catch (error) {
      // Topics might already exist, which is fine
      if (
        error instanceof Error &&
        error.message?.includes('Topic already exists')
      ) {
        this.logger.log('Kafka topics already exist');
      } else {
        this.logger.error('Error creating Kafka topics:', error);
        throw error;
      }
    }
  }

  /**
   * Cleans up Kafka admin connections on module destruction.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.admin.disconnect();
      this.logger.log('Kafka admin service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka admin:', error);
    }
  }
}
