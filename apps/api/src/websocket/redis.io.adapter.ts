import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // The explicit ': ServerOptions' type is removed from the next line
    const serverOptionsWithCors = {
      ...options,
      // We add the CORS and transport settings from your old main.ts here
      cors: { origin: '*' },
      transports: ['websocket'],
    };

    const server = super.createIOServer(port, serverOptionsWithCors) as Server;
    server.adapter(this.adapterConstructor);
    return server;
  }
}
