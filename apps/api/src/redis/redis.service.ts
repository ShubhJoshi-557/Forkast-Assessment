import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: 'redis://localhost:6379', // From your docker-compose.yml
    });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
    console.log('Connected to Redis successfully!');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Example of a command you might use for the order book
  getClient(): RedisClientType {
    return this.client;
  }

  // You can add more specific methods here, e.g.:
  // async getOrderBook(pair: string) { ... }
  // async addOrderToBook(order: any) { ... }
}
