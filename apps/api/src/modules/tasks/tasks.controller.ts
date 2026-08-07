import {
  Body,
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
import { TasksService } from './tasks.service.js';
import {
  EmailDispatchDto,
  RemindQuotationDto,
  WhatsappDispatchDto,
} from './dto/dispatch-task.dto.js';

@Controller('tasks')
@UseGuards(CloudTasksGuard)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private readonly quotationService: QuotationService,
    private readonly tasksService: TasksService,
  ) {}

  @Post('email-dispatch')
  @HttpCode(HttpStatus.OK)
  async emailDispatch(@Body() body: EmailDispatchDto, @Req() request: Request) {
    this.logTask('email-dispatch', request, {
      tenantId: body.tenantId,
      quotationSupplierId: body.quotationSupplierId,
      correlationId: body.correlationId ?? null,
      kind: body.kind ?? 'invite',
    });

    const result = await this.tasksService.handleEmailDispatch(body);

    this.logger.log(
      JSON.stringify({
        queueName: 'email-dispatch',
        result,
        tenantId: body.tenantId,
        quotationSupplierId: body.quotationSupplierId,
      }),
    );

    return result;
  }

  @Post('whatsapp-dispatch')
  @HttpCode(HttpStatus.OK)
  async whatsappDispatch(
    @Body() body: WhatsappDispatchDto,
    @Req() request: Request,
  ) {
    this.logTask('whatsapp-dispatch', request, {
      tenantId: body.tenantId,
      quotationId: body.quotationId,
      correlationId: body.correlationId ?? null,
      kind: body.kind ?? 'invite',
    });

    const result = await this.tasksService.handleWhatsappDispatch(body);

    this.logger.log(
      JSON.stringify({
        queueName: 'whatsapp-dispatch',
        result,
        tenantId: body.tenantId,
        quotationId: body.quotationId,
      }),
    );

    return result;
  }

  @Post('expire-quotations')
  @HttpCode(HttpStatus.OK)
  async expireQuotations(@Req() request: Request) {
    this.logTask('expire-quotations', request, {});

    const result = await this.quotationService.expireExpiredQuotations();

    this.logger.log(
      JSON.stringify({
        queueName: 'expire-quotations',
        expiredCount: result.expiredCount,
      }),
    );

    return result;
  }

  @Post('remind-pending-quotations')
  @HttpCode(HttpStatus.OK)
  async remindPendingQuotations(@Req() request: Request) {
    this.logTask('remind-pending-quotations', request, {});

    const result = await this.quotationService.enqueueDeadlineReminders();

    this.logger.log(
      JSON.stringify({
        queueName: 'remind-pending-quotations',
        enqueuedCount: result.enqueuedCount,
      }),
    );

    return result;
  }

  @Post('remind-quotation')
  @HttpCode(HttpStatus.OK)
  async remindQuotation(
    @Body() body: RemindQuotationDto,
    @Req() request: Request,
  ) {
    this.logTask('remind-quotation', request, {
      quotationId: body.quotationId,
      tenantId: body.tenantId,
    });

    const result = await this.quotationService.sendDeadlineReminder(
      body.quotationId,
    );

    this.logger.log(
      JSON.stringify({
        queueName: 'remind-quotation',
        result,
        quotationId: body.quotationId,
        tenantId: body.tenantId,
      }),
    );

    return result;
  }

  private logTask(
    queueName: string,
    request: Request,
    extra: Record<string, unknown>,
  ): void {
    this.logger.log(
      JSON.stringify({
        queueName,
        taskName: request.headers['x-cloudtasks-taskname'] ?? null,
        retryCount: request.headers['x-cloudtasks-taskretrycount'] ?? '0',
        ...extra,
      }),
    );
  }
}
