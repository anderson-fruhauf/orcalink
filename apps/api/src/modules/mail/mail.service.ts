import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('emails') private readonly emailQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verifies if sending the requested number of emails will exceed the tenant's plan limits.
   * Throws ForbiddenException if limits are violated.
   */
  async checkEmailLimit(tenantId: string, additionalCount: number): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    if (tenant.plan === 'FREE') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Count the number of emails already sent this month
      const current = await this.prisma.quotationSupplier.count({
        where: {
          quotation: {
            tenantId,
          },
          sentAt: {
            gte: startOfMonth,
          },
        },
      });

      if (current + additionalCount > 20) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Limite do plano Free atingido. Faça upgrade para o plano Pro.',
          error: 'Forbidden',
          limit: 20,
          current,
          resource: 'emails',
          plan: 'FREE',
        });
      }
    }
  }

  /**
   * Enqueues an email sending job into the 'emails' queue.
   * Includes 3 attempts with exponential backoff.
   */
  async enqueueEmail(quotationSupplierId: string): Promise<void> {
    await this.emailQueue.add(
      'send-email',
      { quotationSupplierId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
