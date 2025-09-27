import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { Server, ServerOptions } from 'socket.io';

/**
 * RedisIoAdapter provides Redis-based scaling for Socket.IO WebSocket connections.
 *
 * This adapter enables:
 * - Horizontal scaling across multiple application instances
 * - Shared WebSocket state across all instances
 * - Real-time message broadcasting to all connected clients
 * - High availability and fault tolerance
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;

  /**
   * Connects to Redis and initializes the adapter for WebSocket scaling.
   *
   * This method creates separate publisher and subscriber clients for
   * optimal performance and reliability.
   */
  async connectToRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Create publisher client
      this.pubClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
        },
      });

      // Create subscriber client as a duplicate
      this.subClient = this.pubClient.duplicate();

      // Handle Redis connection errors
      this.pubClient.on('error', (err) => {
        console.error('Redis Publisher Client Error:', err);
      });

      this.subClient.on('error', (err) => {
        console.error('Redis Subscriber Client Error:', err);
      });

      // Connect both clients
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      // Create the Redis adapter
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);

      console.log('Redis IO Adapter connected successfully');
    } catch (error) {
      console.error('Failed to connect Redis IO Adapter:', error);
      throw error;
    }
  }

  /**
   * Creates a Socket.IO server with Redis adapter for scaling.
   *
   * @param port - Port number for the server
   * @param options - Socket.IO server options
   * @returns Configured Socket.IO server
   */
  createIOServer(port: number, options?: ServerOptions): Server {
    const serverOptionsWithCors = {
      ...(options && { ...options }),
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket'] as const,
      allowEIO3: true, // Support older Socket.IO clients
      path: '/socket.io/', // Explicitly set the path
      serveClient: false, // Explicitly set serveClient
    };

    const server = super.createIOServer(port, serverOptionsWithCors) as Server;

    // Apply Redis adapter for scaling
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  /**
   * Cleans up Redis connections when the adapter is destroyed.
   */
  async disconnect(): Promise<void> {
    try {
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }
      console.log('Redis IO Adapter disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis IO Adapter:', error);
    }
  }
}
