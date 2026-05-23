import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubmitProposalDto } from './dto/submit-proposal.dto.js';
import { TenantContext } from '../../common/context/tenant-context.js';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuotationByToken(token: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        quotation: {
          include: {
            tenant: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        supplier: true,
        proposal: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!magicLink) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const isExpired = new Date() > magicLink.expiresAt;
    const isClosed = magicLink.quotation.status === 'CLOSED';
    const isDraft = magicLink.quotation.status === 'DRAFT';
    const hasResponded = !!magicLink.proposal;

    if (isDraft) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if ((!magicLink.active || isExpired || isClosed) && !hasResponded) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const now = new Date();
    const deadline = magicLink.quotation.deadline;
    const diffTime = deadline.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const items = magicLink.quotation.items.map((item) => {
      const proposalItem = magicLink.proposal?.items.find(
        (pi) => pi.productId === item.productId,
      );
      return {
        id: item.id,
        name: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        notes: item.observation,
        priceInCents: proposalItem ? proposalItem.unitPrice : undefined,
        unavailable: proposalItem ? proposalItem.unavailable : undefined,
      };
    });

    return {
      companyName: magicLink.quotation.tenant.name,
      quotationTitle: magicLink.quotation.title,
      deadline: magicLink.quotation.deadline.toISOString().split('T')[0],
      daysRemaining,
      status: magicLink.quotation.status.toLowerCase(),
      items,
      alreadyResponded: hasResponded,
      deliveryDays: magicLink.proposal?.deliveryDays ?? undefined,
      paymentCondition: magicLink.proposal?.paymentTerms ?? undefined,
      notes: magicLink.proposal?.notes ?? undefined,
    };
  }

  async submitProposal(token: string, dto: SubmitProposalDto) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        quotation: {
          include: {
            items: true,
          },
        },
        proposal: true,
      },
    });

    if (!magicLink) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const isExpired = new Date() > magicLink.expiresAt;
    const isClosed = magicLink.quotation.status === 'CLOSED';
    const isDraft = magicLink.quotation.status === 'DRAFT';

    if (isDraft || !magicLink.active || isExpired || isClosed) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if (magicLink.proposal) {
      throw new ConflictException('Proposta já enviada para esta cotação');
    }

    const quotationItems = magicLink.quotation.items;
    const submittedItems = dto.items || [];

    if (submittedItems.length !== quotationItems.length) {
      throw new BadRequestException('Todos os itens da cotação devem ser preenchidos.');
    }

    const quotationItemIds = new Set(quotationItems.map((item) => item.id));
    for (const item of submittedItems) {
      if (!quotationItemIds.has(item.quotationItemId)) {
        throw new BadRequestException(`Item inválido na proposta: ${item.quotationItemId}`);
      }
    }

    for (const item of submittedItems) {
      const isUnavailable = item.unavailable === true;
      if (!isUnavailable) {
        if (item.priceInCents === undefined || item.priceInCents === null || item.priceInCents <= 0) {
          throw new BadRequestException(
            'Todos os itens devem ter um preço maior que zero ou ser marcados como indisponíveis.',
          );
        }
      }
    }

    return TenantContext.run(magicLink.quotation.tenantId, async () => {
      return this.prisma.$transaction(async (tx: any) => {
        const proposal = await tx.proposal.create({
          data: {
            quotationId: magicLink.quotationId,
            supplierId: magicLink.supplierId,
            magicLinkId: magicLink.id,
            deliveryDays: dto.deliveryDays,
            paymentTerms: dto.paymentCondition,
            notes: dto.notes || null,
            submittedAt: new Date(),
            items: {
              create: submittedItems.map((item) => {
                const quotationItem = quotationItems.find((qi) => qi.id === item.quotationItemId);
                return {
                  productId: quotationItem.productId,
                  unitPrice: item.unavailable ? 0 : item.priceInCents,
                  unavailable: item.unavailable ?? false,
                };
              }),
            },
          },
        });

        await tx.quotationSupplier.update({
          where: {
            quotationId_supplierId: {
              quotationId: magicLink.quotationId,
              supplierId: magicLink.supplierId,
            },
          },
          data: {
            responseStatus: 'SUBMITTED',
          },
        });

        return proposal;
      });
    });
  }
}
