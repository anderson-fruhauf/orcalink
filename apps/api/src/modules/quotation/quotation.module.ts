import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service.js';
import { QuotationController } from './quotation.controller.js';
import { MailModule } from '../mail/mail.module.js';
import { TaskQueueModule } from '../tasks/task-queue.module.js';

@Module({
  imports: [MailModule, TaskQueueModule],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
