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

  /**
   * Sets a key-value pair in Redis with TTL.
   *
   * @param key - Redis key
   * @param value - Value to store
   * @param ttlSeconds - Time to live in seconds
   */
  async setWithTTL(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.client.setEx(key, ttlSeconds, value);
    } catch (error) {
      this.logger.error(`Failed to set key ${key} with TTL:`, error);
      throw error;
    }
  }

  /**
   * Gets a value from Redis by key.
   *
   * @param key - Redis key
   * @returns Value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Adds a member to a Redis sorted set with score.
   *
   * @param key - Sorted set key
   * @param score - Score for the member
   * @param member - Member to add
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      this.logger.error(`Failed to add member to sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Removes a member from a Redis sorted set.
   *
   * @param key - Sorted set key
   * @param member - Member to remove
   */
  async zrem(key: string, member: string): Promise<void> {
    try {
      await this.client.zRem(key, member);
    } catch (error) {
      this.logger.error(
        `Failed to remove member from sorted set ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gets members from a Redis sorted set by score range.
   *
   * @param key - Sorted set key
   * @param min - Minimum score
   * @param max - Maximum score
   * @param withScores - Whether to include scores in response
   * @returns Array of members (and scores if requested)
   */
  async zrangeByScore(
    key: string,
    min: number | string,
    max: number | string,
    withScores = false,
  ): Promise<string[]> {
    try {
      if (withScores) {
        const result = await this.client.zRangeByScoreWithScores(key, min, max);
        return result.map((item) => item.value);
      }
      return await this.client.zRangeByScore(key, min, max);
    } catch (error) {
      this.logger.error(`Failed to get range from sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Gets members from a Redis sorted set in reverse order by score range.
   *
   * @param key - Sorted set key
   * @param min - Minimum score
   * @param max - Maximum score
   * @param withScores - Whether to include scores in response
   * @returns Array of members (and scores if requested)
   */
  async zrevrangeByScore(
    key: string,
    min: number | string,
    max: number | string,
    withScores = false,
  ): Promise<string[]> {
    try {
      if (withScores) {
        const result = await this.client.zRangeByScoreWithScores(key, min, max);
        return result.map((item) => item.value).reverse();
      }
      const result = await this.client.zRangeByScore(key, min, max);
      return result.reverse();
    } catch (error) {
      this.logger.error(
        `Failed to get reverse range from sorted set ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes a key from Redis.
   *
   * @param key - Redis key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Sets expiration time for a key.
   *
   * @param key - Redis key
   * @param seconds - Expiration time in seconds
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}:`, error);
      throw error;
    }
  }
}
