import { Module } from '@nestjs/common';
import { QuotationModule } from '../quotation/quotation.module.js';
import { MailModule } from '../mail/mail.module.js';
import { WhatsappModule } from '../whatsapp/whatsapp.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { TasksController } from './tasks.controller.js';
import { CloudTasksGuard } from './cloud-tasks.guard.js';
import { TasksService } from './tasks.service.js';
import { TaskQueueModule } from './task-queue.module.js';

@Module({
  imports: [
    PrismaModule,
    QuotationModule,
    MailModule,
    WhatsappModule,
    TaskQueueModule,
  ],
  controllers: [TasksController],
  providers: [CloudTasksGuard, TasksService],
})
export class TasksModule {}
