import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { QuotationService } from '../quotation/quotation.service.js';
import { CloudTasksGuard } from './cloud-tasks.guard.js';

@Controller('tasks')
@UseGuards(CloudTasksGuard)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly quotationService: QuotationService) {}

  @Post('expire-quotations')
  @HttpCode(HttpStatus.OK)
  async expireQuotations(@Req() request: Request) {
    const retryCount =
      request.headers['x-cloudtasks-taskretrycount'] ?? '0';

    this.logger.log(
      JSON.stringify({
        queueName: 'expire-quotations',
        taskName: request.headers['x-cloudtasks-taskname'] ?? null,
        retryCount,
      }),
    );

    const result = await this.quotationService.expireExpiredQuotations();

    this.logger.log(
      JSON.stringify({
        queueName: 'expire-quotations',
        expiredCount: result.expiredCount,
      }),
    );

    return result;
  }
}
