import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { SERVICE_UNAVAILABLE_MESSAGE } from './common/constants/error-messages.js';
import { TASK_QUEUE, type TaskQueue } from './modules/tasks/task-queue.interface.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Optional() @Inject(TASK_QUEUE) private readonly taskQueue?: TaskQueue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReady() {
    const dbHealthy = await this.prisma.isHealthy();
    if (!dbHealthy) {
      throw new ServiceUnavailableException(SERVICE_UNAVAILABLE_MESSAGE);
    }

    const isWorker = process.env['SERVICE_ROLE'] === 'worker';
    if (isWorker && this.taskQueue) {
      const queueHealthy = await this.taskQueue.isHealthy();
      if (!queueHealthy) {
        throw new ServiceUnavailableException(SERVICE_UNAVAILABLE_MESSAGE);
      }
    }

    return {
      status: 'ok',
      database: 'up',
      ...(isWorker ? { queue: 'up' } : {}),
      timestamp: new Date().toISOString(),
    };
  }
}
