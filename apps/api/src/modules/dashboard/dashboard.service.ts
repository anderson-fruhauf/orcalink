import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const tenantId = TenantContext.getTenantId();

    const [activeQuotations, totalSuppliers, totalProducts, pendingProposals] =
      await Promise.all([
        this.prisma.quotation.count({
          where: { status: 'OPEN', tenantId },
        }),
        this.prisma.supplier.count({
          where: { tenantId },
        }),
        this.prisma.product.count({
          where: { tenantId },
        }),
        this.prisma.quotationSupplier.count({
          where: {
            responseStatus: 'PENDING',
            quotation: {
              status: 'OPEN',
              tenantId,
            },
          },
        }),
      ]);

    return {
      activeQuotations,
      totalSuppliers,
      totalProducts,
      pendingProposals,
    };
  }
}
