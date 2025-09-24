import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
// Implement both OnModuleInit and OnModuleDestroy
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  // This method will be called automatically when the application shuts down
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
