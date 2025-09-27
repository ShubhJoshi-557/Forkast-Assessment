import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/**
 * RedisService manages Redis connections and provides caching functionality.
 *
 * This service handles:
 * - Redis connection management
 * - WebSocket adapter integration
 * - Caching for high-frequency data
 * - Session management
 *
 * Redis is used for:
 * - WebSocket scaling across multiple instances
 * - Caching frequently accessed data
 * - Session storage
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  /**
   * Initializes the Redis connection on module startup.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 10000,
        },
      });

      // Handle Redis connection errors
      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis client disconnected');
      });

      await this.client.connect();
      this.logger.log('Connected to Redis successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Cleans up Redis connections on module destruction.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.logger.log('Redis client disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Redis client:', error);
    }
  }

  /**
   * Gets the Redis client instance for direct operations.
   *
   * @returns Redis client instance
   */
  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Checks if Redis is connected and healthy.
   *
   * @returns Promise<boolean> - True if Redis is connected
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }
}
