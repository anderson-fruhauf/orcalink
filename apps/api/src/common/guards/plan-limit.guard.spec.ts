import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PlanLimitGuard } from './plan-limit.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AUTH_UNAUTHORIZED_MESSAGE,
  PLAN_LIMIT_MESSAGE,
} from '../constants/error-messages.js';

describe('PlanLimitGuard', () => {
  let guard: PlanLimitGuard;

  const mockReflector = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
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
        PlanLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    guard = module.get<PlanLimitGuard>(PlanLimitGuard);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no metadata is set', async () => {
    mockReflector.get.mockReturnValue(undefined);
    const context = createMockExecutionContext({ tenantId: 'tenant-1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no request user is present', async () => {
    mockReflector.get.mockReturnValue('suppliers');
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
    );
  });

  it('should throw UnauthorizedException if no tenantId is in request user', async () => {
    mockReflector.get.mockReturnValue('suppliers');
    const context = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
    );
  });

  it('should throw UnauthorizedException if tenant is not found in local db', async () => {
    mockReflector.get.mockReturnValue('suppliers');
    const context = createMockExecutionContext({ tenantId: 'tenant-1' });
    mockPrismaService.tenant.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
    );
  });

  it('should bypass all checks and return true for PRO plan', async () => {
    mockReflector.get.mockReturnValue('suppliers');
    const context = createMockExecutionContext({ tenantId: 'tenant-1' });
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      plan: 'PRO',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  describe('FREE Plan Limit Enforcement', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        plan: 'FREE',
      });
    });

    it('should allow creation of suppliers if count is within limit', async () => {
      mockReflector.get.mockReturnValue('suppliers');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.supplier.count.mockResolvedValue(9); // limit: 10

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.supplier.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should block creation of suppliers and throw ForbiddenException if limit is reached', async () => {
      mockReflector.get.mockReturnValue('suppliers');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.supplier.count.mockResolvedValue(10); // limit: 10

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      try {
        await guard.canActivate(context);
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        const response = err.getResponse() as { message: string };
        expect(response.message).toBe(PLAN_LIMIT_MESSAGE);
      }
    });

    it('should allow creation of products if count is within limit', async () => {
      mockReflector.get.mockReturnValue('products');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.product.count.mockResolvedValue(49); // limit: 50

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should block creation of products and throw ForbiddenException if limit is reached', async () => {
      mockReflector.get.mockReturnValue('products');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.product.count.mockResolvedValue(50); // limit: 50

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow creation of quotations if count is within limit', async () => {
      mockReflector.get.mockReturnValue('activeQuotations');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.quotation.count.mockResolvedValue(4); // limit: 5

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          status: { not: 'CLOSED' },
        },
      });
    });

    it('should block creation of quotations and throw ForbiddenException if limit is reached', async () => {
      mockReflector.get.mockReturnValue('quotations');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.quotation.count.mockResolvedValue(5); // limit: 5

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow sending emails if count is within limit', async () => {
      mockReflector.get.mockReturnValue('emails');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.quotationSupplier.count.mockResolvedValue(19); // limit: 20

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.quotationSupplier.count).toHaveBeenCalledWith({
        where: {
          quotation: {
            tenantId: 'tenant-1',
          },
          sentAt: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should block sending emails and throw ForbiddenException if limit is reached', async () => {
      mockReflector.get.mockReturnValue('emails');
      const context = createMockExecutionContext({ tenantId: 'tenant-1' });
      mockPrismaService.quotationSupplier.count.mockResolvedValue(20); // limit: 20

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  function createMockExecutionContext(userPayload: any): ExecutionContext {
    const request = {
      user: userPayload,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  }
});
