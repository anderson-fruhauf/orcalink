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
          where: { status: 'OPEN' },
        }),
        this.prisma.supplier.count(),
        this.prisma.product.count(),
        this.prisma.quotationSupplier.count({
          where: {
            responseStatus: 'PENDING',
            quotation: {
              status: 'OPEN',
              tenantId: tenantId,
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
