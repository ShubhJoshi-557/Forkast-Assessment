import { Injectable, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';

@Injectable()
export class KafkaAdminService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly admin: Admin;

  constructor() {
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables.',
      );
    }

    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
    });

    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    await this.admin.connect();
    await this.createTopics();
  }

  private async createTopics() {
    const topics = [
      {
        topic: 'orders.new',
        numPartitions: 8, // Match consumer concurrency
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
      console.log('✅ Kafka topics created successfully');
    } catch (error) {
      // Topics might already exist, which is fine
      if (
        error instanceof Error &&
        error.message?.includes('Topic already exists')
      ) {
        console.log('ℹ️ Kafka topics already exist');
      } else {
        console.error('❌ Error creating Kafka topics:', error);
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.admin.disconnect();
  }
}
