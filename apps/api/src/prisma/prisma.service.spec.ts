import { getMultiTenancyExtension } from './prisma.service.js';
import { ForbiddenException } from '@nestjs/common';

describe('getMultiTenancyExtension', () => {
  let tenantId: string | undefined;
  const mockGetTenantId = () => tenantId;
  const extension = getMultiTenancyExtension(mockGetTenantId);
  const $allOperations = extension.query.$allModels.$allOperations;

  beforeEach(() => {
    tenantId = undefined;
  });

  it('should inject tenantId into findMany queries when tenant context is active', async () => {
    tenantId = 'tenant-123';
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = { where: { name: 'Electronics' } };

    await $allOperations({
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
    tenantId = undefined;
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = { where: { name: 'Electronics' } };

    await $allOperations({
      model: 'Category',
      operation: 'findMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: {
        name: 'Electronics',
      },
    });
  });

  it('should translate findUnique to findFirst and inject tenantId', async () => {
    tenantId = 'tenant-123';
    const mockQuery = jest.fn().mockResolvedValue(null);
    const args = { where: { id: 'category-id' } };

    await $allOperations({
      model: 'Category',
      operation: 'findUnique',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: {
        id: 'category-id',
        tenantId: 'tenant-123',
      },
      operation: 'findFirst',
    });
  });

  it('should inject tenantId into create queries', async () => {
    tenantId = 'tenant-123';
    const mockQuery = jest.fn().mockResolvedValue({});
    const args = { data: { name: 'Electronics' } };

    await $allOperations({
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
    tenantId = 'tenant-123';
    // O mockQuery deve retornar um registro fictício no lookup de findFirst para simular que pertence ao tenant
    const mockQuery = jest.fn().mockImplementation((options) => {
      if (options.operation === 'findFirst') {
        return Promise.resolve({ id: 'category-id', tenantId: 'tenant-123' });
      }
      return Promise.resolve({ id: 'category-id', name: 'Updated' });
    });

    const args = {
      where: { id: 'category-id' },
      data: { name: 'Updated' },
    };

    const result = await $allOperations({
      model: 'Category',
      operation: 'update',
      args,
      query: mockQuery,
    });

    // O primeiro call é a validação com findFirst, o segundo call é a atualização de fato
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
    tenantId = 'tenant-123';
    // O mockQuery retorna null no findFirst para simular que não pertence ao tenant
    const mockQuery = jest.fn().mockResolvedValue(null);

    const args = {
      where: { id: 'category-id' },
      data: { name: 'Updated' },
    };

    await expect(
      $allOperations({
        model: 'Category',
        operation: 'update',
        args,
        query: mockQuery,
      })
    ).rejects.toThrow(ForbiddenException);
  });
});
