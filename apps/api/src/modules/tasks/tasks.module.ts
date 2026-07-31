import { Module } from '@nestjs/common';
import { QuotationModule } from '../quotation/quotation.module.js';
import { TasksController } from './tasks.controller.js';
import { CloudTasksGuard } from './cloud-tasks.guard.js';

@Module({
  imports: [QuotationModule],
  controllers: [TasksController],
  providers: [CloudTasksGuard],
})
export class TasksModule {}
