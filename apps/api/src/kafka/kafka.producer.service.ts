import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  CompressionTypes,
  Kafka,
  Producer,
  ProducerBatch,
  ProducerRecord,
} from 'kafkajs';

/**
 * KafkaProducerService handles message production to Kafka topics.
 *
 * This service provides:
 * - High-performance message production with GZIP compression
 * - Batch processing capabilities for bulk operations
 * - Connection management and error handling
 * - Optimized configuration for trading system requirements
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor() {
    // Validate required environment variables
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables',
      );
    }

    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 30000,
      connectionTimeout: 3000,
      retry: {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 5, // Balance between throughput and memory usage
      idempotent: false, // Disabled for better throughput
    });
  }

  /**
   * Initializes the Kafka producer connection.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Produces a single message to a Kafka topic.
   *
   * @param record - Producer record containing topic, key, and value
   * @returns Promise with message metadata
   */
  async produce(record: ProducerRecord): Promise<any> {
    try {
      const result = await this.producer.send({
        ...record,
        compression: CompressionTypes.GZIP,
      });

      this.logger.debug(`Message produced to topic ${record.topic}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to produce message to topic ${record.topic}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Produces multiple messages in a batch for improved performance.
   *
   * @param batch - Producer batch containing multiple topic batches
   * @returns Promise with batch metadata
   */
  async produceBatch(batch: ProducerBatch): Promise<any> {
    try {
      const result = await this.producer.sendBatch({
        ...batch,
        compression: CompressionTypes.GZIP,
      });

      this.logger.debug(
        `Batch produced to ${batch.topicMessages?.length || 0} topics`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to produce batch:', error);
      throw error;
    }
  }

  /**
   * Cleans up the Kafka producer connection.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer:', error);
    }
  }
}
