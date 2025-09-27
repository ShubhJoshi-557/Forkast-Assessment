import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService provides database access and connection management.
 *
 * This service:
 * - Manages PostgreSQL database connections
 * - Provides optimized configuration for high-throughput trading
 * - Handles connection lifecycle and cleanup
 * - Implements proper error handling and logging
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not defined in the environment variables',
      );
    }

    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Optimize connection pool for high-throughput matching engine
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
  }

  /**
   * Initializes the database connection on module startup.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Cleans up database connections on module destruction.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Checks if the database is healthy and accessible.
   *
   * @returns Promise<boolean> - True if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }
}
