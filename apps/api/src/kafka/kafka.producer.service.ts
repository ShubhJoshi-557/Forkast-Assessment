import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  CompressionTypes,
  Kafka,
  Producer,
  ProducerBatch,
  ProducerRecord,
} from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER_URL ?? 'localhost:29092'],
    // requestTimeout: 30000,
    // connectionTimeout: 3000,
    // retry: { retries: 5, initialRetryTime: 100 },
  });

  private readonly producer: Producer = this.kafka.producer({
    // maxInFlightRequests: 5, // default is fine unless idempotent
    // idempotent: false,      // enable only if you need exactly-once at cost of throughput
  });

  async onModuleInit() {
    await this.producer.connect();
  }

  async produce(record: ProducerRecord) {
    // Make compression the default; callers can override if needed
    return this.producer.send({
      ...record,
      compression: CompressionTypes.GZIP,
    });
  }

  async produceBatch(batch: ProducerBatch) {
    // For callers that want to push multiple topic batches at once
    return this.producer.sendBatch({
      ...batch,
      compression: CompressionTypes.GZIP,
    });
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }
}
