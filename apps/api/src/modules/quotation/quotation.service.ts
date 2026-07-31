import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, Quotation } from '../../generated/prisma/client.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';
import { QueryQuotationDto } from './dto/query-quotation.dto.js';
import { CreateQuotationItemDto } from './dto/create-quotation-item.dto.js';
import { AssociateSuppliersDto } from './dto/associate-suppliers.dto.js';
import { MailService } from '../mail/mail.service.js';
import { UpdateQuotationSupplierChannelDto } from './dto/update-quotation-supplier-channel.dto.js';
import {
  TASK_QUEUE,
  type TaskQueue,
} from '../tasks/task-queue.interface.js';

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(TASK_QUEUE) private readonly taskQueue: TaskQueue,
  ) {}

  async create(dto: CreateQuotationDto): Promise<Quotation> {
    return await this.prisma.quotation.create({
      data: {
        title: dto.title,
        deadline: new Date(dto.deadline),
        status: 'DRAFT',
      },
    });
  }

  async findAll(query: QueryQuotationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {};

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              items: true,
              suppliers: true,
            },
          },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                internalCode: true,
              },
            },
          },
        },
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                contactName: true,
              },
            },
          },
        },
        proposals: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        magicLinks: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotação não encontrada');
    }

    return quotation;
  }

  async update(id: string, dto: UpdateQuotationDto): Promise<Quotation> {
    const quotation = await this.findOne(id);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser editadas.',
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        title: dto.title,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async remove(id: string): Promise<Quotation> {
    const quotation = await this.findOne(id);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser excluídas.',
      );
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.magicLink.deleteMany({ where: { quotationId: id } });
      await tx.quotationSupplier.deleteMany({ where: { quotationId: id } });
      return tx.quotation.delete({ where: { id } });
    }) as Promise<Quotation>;
  }

  async addItem(quotationId: string, dto: CreateQuotationItemDto) {
    const quotation = await this.findOne(quotationId);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser modificadas.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    return this.prisma.quotationItem.upsert({
      where: {
        quotationId_productId: {
          quotationId,
          productId: dto.productId,
        },
      },
      create: {
        quotationId,
        productId: dto.productId,
        quantity: dto.quantity,
        observation: dto.notes || null,
      },
      update: {
        quantity: dto.quantity,
        observation: dto.notes !== undefined ? dto.notes : undefined,
      },
    });
  }

  async removeItem(quotationId: string, itemId: string) {
    const quotation = await this.findOne(quotationId);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser modificadas.',
      );
    }

    const item = await this.prisma.quotationItem.findFirst({
      where: { id: itemId, quotationId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado.');
    }

    return this.prisma.quotationItem.delete({
      where: { id: itemId },
    });
  }

  async associateSuppliers(id: string, dto: AssociateSuppliersDto) {
    const quotation = await this.findOne(id);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser modificadas.',
      );
    }

    let suppliers: Array<{ id: string; preferredChannel: string }> = [];

    if (dto.supplierIds.length > 0) {
      suppliers = await this.prisma.supplier.findMany({
        where: { id: { in: dto.supplierIds } },
      });
      if (suppliers.length !== dto.supplierIds.length) {
        throw new NotFoundException(
          'Um ou mais fornecedores não foram encontrados.',
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.quotationSupplier.deleteMany({
        where: { quotationId: id },
      });

      if (dto.supplierIds.length > 0) {
        await tx.quotationSupplier.createMany({
          data: dto.supplierIds.map((supplierId) => ({
            quotationId: id,
            supplierId,
            channel:
              suppliers.find((supplier) => supplier.id === supplierId)
                ?.preferredChannel || 'EMAIL',
          })),
        });
      }

      return tx.quotation.findUnique({
        where: { id },
        include: {
          suppliers: {
            include: {
              supplier: true,
            },
          },
        },
      });
    });
  }

  async updateSupplierChannel(
    quotationId: string,
    supplierId: string,
    dto: UpdateQuotationSupplierChannelDto,
  ) {
    const quotation = await this.findOne(quotationId);
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'O canal de envio só pode ser alterado antes da publicação.',
      );
    }

    const association = await this.prisma.quotationSupplier.findUnique({
      where: {
        quotationId_supplierId: {
          quotationId,
          supplierId,
        },
      },
    });

    if (!association) {
      throw new NotFoundException('Fornecedor não associado a esta cotação.');
    }

    return this.prisma.quotationSupplier.update({
      where: { id: association.id },
      data: { channel: dto.channel },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            contactName: true,
          },
        },
      },
    });
  }

  async publish(id: string): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        suppliers: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotação não encontrada');
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em rascunho podem ser publicadas.',
      );
    }

    if (quotation.items.length === 0) {
      throw new BadRequestException(
        'A cotação deve conter pelo menos um produto antes de ser publicada.',
      );
    }

    if (quotation.suppliers.length === 0) {
      throw new BadRequestException(
        'A cotação deve ter pelo menos um fornecedor associado antes de ser publicada.',
      );
    }

    // 1. Verify monthly email limit before publishing
    await this.mailService.checkEmailLimit(
      quotation.tenantId,
      quotation.suppliers.length,
    );

    const secret =
      process.env['MAGIC_LINK_SECRET'] ||
      process.env['JWT_SECRET'] ||
      'default-magic-link-secret';

    const updatedQuotation = (await this.prisma.$transaction(
      async (tx: any) => {
        const updated = await tx.quotation.update({
          where: { id },
          data: { status: 'OPEN' },
        });

        for (const qs of quotation.suppliers) {
          const token = createHmac('sha256', secret)
            .update(qs.id)
            .digest('hex');

          await tx.magicLink.upsert({
            where: { token },
            create: {
              token,
              quotationId: id,
              supplierId: qs.supplierId,
              expiresAt: quotation.deadline,
            },
            update: {
              active: true,
              expiresAt: quotation.deadline,
            },
          });
        }

        return updated;
      },
    )) as Quotation;

    await this.dispatchQuotationInvites(
      id,
      quotation.tenantId,
      quotation.suppliers,
    );

    return updatedQuotation;
  }

  async resend(id: string, supplierId: string): Promise<any> {
    const qs = await this.prisma.quotationSupplier.findUnique({
      where: {
        quotationId_supplierId: {
          quotationId: id,
          supplierId,
        },
      },
      include: {
        quotation: true,
      },
    });

    if (!qs) {
      throw new NotFoundException('Fornecedor não associado a esta cotação.');
    }

    if (qs.quotation.status !== 'OPEN') {
      throw new BadRequestException(
        'Apenas cotações abertas podem ter e-mails reenviados.',
      );
    }

    if (qs.responseStatus !== 'PENDING') {
      throw new BadRequestException(
        'Apenas convites com status pendente podem ser reenviados.',
      );
    }

    // Verify monthly email limit for 1 email resend
    await this.mailService.checkEmailLimit(qs.quotation.tenantId, 1);

    await this.dispatchQuotationInvites(id, qs.quotation.tenantId, [qs]);

    return { success: true };
  }

  private async dispatchQuotationInvites(
    quotationId: string,
    tenantId: string,
    suppliers: Array<{ id: string; channel?: string }>,
  ): Promise<void> {
    const whatsappSuppliers = suppliers.filter(
      (supplier) => supplier.channel === 'WHATSAPP',
    );
    const emailSuppliers = suppliers.filter(
      (supplier) => supplier.channel !== 'WHATSAPP',
    );
    const correlationId = randomUUID();
    const dispatchRound = Date.now();

    const supplierIds = suppliers.map((supplier) => supplier.id);
    if (supplierIds.length > 0) {
      await this.prisma.quotationSupplier.updateMany({
        where: { id: { in: supplierIds } },
        data: {
          dispatchStatus: 'QUEUED',
          emailError: null,
          whatsappError: null,
        },
      });
    }

    for (const supplier of emailSuppliers) {
      await this.taskQueue.enqueue(
        'email-dispatch',
        {
          tenantId,
          quotationSupplierId: supplier.id,
          correlationId,
        },
        {
          dedupeKey: `email:${supplier.id}:${dispatchRound}`,
        },
      );
    }

    if (whatsappSuppliers.length > 0) {
      await this.taskQueue.enqueue(
        'whatsapp-dispatch',
        {
          tenantId,
          quotationId,
          quotationSupplierIds: whatsappSuppliers.map((s) => s.id),
          correlationId,
        },
        {
          dedupeKey: `whatsapp:${quotationId}:${dispatchRound}`,
        },
      );
    }
  }

  async close(id: string): Promise<Quotation> {
    const quotation = await this.findOne(id);
    if (quotation.status !== 'OPEN') {
      throw new BadRequestException(
        'Apenas cotações abertas podem ser encerradas.',
      );
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updatedQuotation = await tx.quotation.update({
        where: { id },
        data: { status: 'CLOSED' },
      });

      await tx.magicLink.updateMany({
        where: { quotationId: id },
        data: { active: false },
      });

      await tx.quotationSupplier.updateMany({
        where: {
          quotationId: id,
          responseStatus: 'PENDING',
        },
        data: {
          responseStatus: 'EXPIRED',
        },
      });

      return updatedQuotation;
    }) as Promise<Quotation>;
  }

  /**
   * Encerra cotações OPEN cujo deadline já passou.
   * Usado pelo Cloud Scheduler via POST /api/tasks/expire-quotations.
   * Roda sem TenantContext — varre todos os tenants.
   */
  async expireExpiredQuotations(): Promise<{ expiredCount: number }> {
    return this.prisma.$transaction(async (tx: any) => {
      const expired = await tx.quotation.findMany({
        where: {
          status: 'OPEN',
          deadline: { lt: new Date() },
        },
        select: { id: true },
      });

      if (expired.length === 0) {
        return { expiredCount: 0 };
      }

      const ids = expired.map((quotation: { id: string }) => quotation.id);

      await tx.quotation.updateMany({
        where: { id: { in: ids }, status: 'OPEN' },
        data: { status: 'CLOSED' },
      });

      await tx.magicLink.updateMany({
        where: { quotationId: { in: ids } },
        data: { active: false },
      });

      await tx.quotationSupplier.updateMany({
        where: {
          quotationId: { in: ids },
          responseStatus: 'PENDING',
        },
        data: { responseStatus: 'EXPIRED' },
      });

      return { expiredCount: ids.length };
    });
  }

  async duplicate(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotação não encontrada');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const newQuotation = await tx.quotation.create({
        data: {
          title: `${quotation.title} (Cópia)`,
          deadline: quotation.deadline,
          status: 'DRAFT',
        },
      });

      if (quotation.items.length > 0) {
        await tx.quotationItem.createMany({
          data: quotation.items.map((item: any) => ({
            quotationId: newQuotation.id,
            productId: item.productId,
            quantity: item.quantity,
            observation: item.observation,
          })),
        });
      }

      return tx.quotation.findUnique({
        where: { id: newQuotation.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }
}
