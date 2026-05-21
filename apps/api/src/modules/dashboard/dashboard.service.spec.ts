/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    quotation: {
      count: jest.fn(),
    },
    supplier: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    quotationSupplier: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return correct counts based on database queries', async () => {
      mockPrismaService.quotation.count.mockResolvedValue(5);
      mockPrismaService.supplier.count.mockResolvedValue(10);
      mockPrismaService.product.count.mockResolvedValue(15);
      mockPrismaService.quotationSupplier.count.mockResolvedValue(2);

      const spyTenant = jest
        .spyOn(TenantContext, 'getTenantId')
        .mockReturnValue('test-tenant-id');

      const result = await service.getStats();

      expect(prismaService.quotation.count).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
      });
      expect(prismaService.supplier.count).toHaveBeenCalled();
      expect(prismaService.product.count).toHaveBeenCalled();
      expect(prismaService.quotationSupplier.count).toHaveBeenCalledWith({
        where: {
          responseStatus: 'PENDING',
          quotation: {
            status: 'OPEN',
            tenantId: 'test-tenant-id',
          },
        },
      });

      expect(result).toEqual({
        activeQuotations: 5,
        totalSuppliers: 10,
        totalProducts: 15,
        pendingProposals: 2,
      });

      spyTenant.mockRestore();
    });
  });
});
