import { ForbiddenException } from '@nestjs/common';
import { multiTenancyAllOperations } from './prisma.service.js';
import { TenantContext } from '../common/context/tenant-context.js';

describe('multiTenancyExtension', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should inject tenantId into findMany queries when tenant context is active', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = { where: { name: 'Electronics' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: {
        name: 'Electronics',
        tenantId: 'tenant-123',
      },
    });
  });

  it('should not inject tenantId when tenant context is inactive', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue(undefined);
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = { where: { name: 'Electronics' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { name: 'Electronics' },
    });
  });

  it('should NOT modify findUnique (only accepts unique fields)', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue(null);
    const args = { where: { id: 'category-id' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findUnique',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { id: 'category-id' },
    });
  });

  it('should inject tenantId into create queries', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({});
    const args = { data: { name: 'Electronics' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'create',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      data: {
        name: 'Electronics',
        tenantId: 'tenant-123',
      },
    });
  });

  it('should allow update if record belongs to tenant', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockImplementation((options: any) => {
      if (options.operation === 'findFirst') {
        return Promise.resolve({ id: 'category-id', tenantId: 'tenant-123' });
      }
      return Promise.resolve({ id: 'category-id', name: 'Updated' });
    });

    const args = {
      where: { id: 'category-id' },
      data: { name: 'Updated' },
    };

    const result = await multiTenancyAllOperations({
      model: 'Category',
      operation: 'update',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenNthCalledWith(1, {
      operation: 'findFirst',
      args: {
        where: {
          id: 'category-id',
          tenantId: 'tenant-123',
        },
      },
    });
    expect(mockQuery).toHaveBeenNthCalledWith(2, args);
    expect(result).toEqual({ id: 'category-id', name: 'Updated' });
  });

  it('should throw ForbiddenException on update if record does not belong to tenant', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue(null);

    const args = {
      where: { id: 'category-id' },
      data: { name: 'Updated' },
    };

    await expect(
      multiTenancyAllOperations({
        model: 'Category',
        operation: 'update',
        args,
        query: mockQuery,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
