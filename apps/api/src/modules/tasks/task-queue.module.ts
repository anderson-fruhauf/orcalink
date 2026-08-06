import { Module } from '@nestjs/common';
import { TASK_QUEUE } from './task-queue.interface.js';
import { CloudTasksQueue } from './cloud-tasks.queue.js';

@Module({
  providers: [
    {
      provide: TASK_QUEUE,
      useClass: CloudTasksQueue,
    },
  ],
  exports: [TASK_QUEUE],
})
export class TaskQueueModule {}
