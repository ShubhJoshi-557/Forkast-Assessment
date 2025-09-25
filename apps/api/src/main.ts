/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { MicroserviceOptions, Transport } from '@nestjs/microservices';
// import { IoAdapter } from '@nestjs/platform-socket.io';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
//   app.enableCors();
//   app.useWebSocketAdapter(new IoAdapter(app));

//   app.connectMicroservice<MicroserviceOptions>({
//     transport: Transport.KAFKA,
//     options: {
//       client: {
//         brokers: [process.env.KAFKA_BROKER_URL].filter(
//           (broker): broker is string => typeof broker === 'string',
//         ),
//       },
//       consumer: {
//         groupId: 'matching-engine-group',
//       },
//     },
//   });

//   app.enableShutdownHooks();

//   await app.startAllMicroservices();
//   await app.listen(3001);

//   console.log(`🚀 API server running on: ${await app.getUrl()}`);
// }
// void bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io'; // Import IoAdapter
import { AppModule } from './app.module';

// Create a custom adapter to pass options to the Socket.IO server
export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    options.transports = ['websocket']; // Force WebSocket transport only
    options.cors = { origin: '*' }; // Explicitly set CORS here
    const server = super.createIOServer(port, options);
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Use our custom adapter
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // This line is no longer needed as the adapter handles it
  app.enableCors();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER_URL].filter(
          (broker): broker is string => typeof broker === 'string',
        ),
      },
      consumer: {
        groupId: 'matching-engine-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
  console.log(`🚀 API server running on: ${await app.getUrl()}`);
}
void bootstrap();
