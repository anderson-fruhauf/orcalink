import { ForbiddenException } from '@nestjs/common';
import { multiTenancyAllOperations } from './prisma.service.js';
import { TenantContext } from '../common/context/tenant-context.js';

describe('multiTenancyExtension', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // ── READ operations ────────────────────────────────────────────

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

  it('should inject tenantId into findFirst queries', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue(null);
    const args = { where: { id: 'cat-1' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findFirst',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { id: 'cat-1', tenantId: 'tenant-123' },
    });
  });

  it('should inject tenantId into findUnique queries (extended where)', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue(null);
    const args = { where: { id: 'cat-1' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findUnique',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { id: 'cat-1', tenantId: 'tenant-123' },
    });
  });

  it('should inject tenantId into count queries', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue(0);
    const args = { where: { status: 'OPEN' } };

    await multiTenancyAllOperations({
      model: 'Quotation',
      operation: 'count',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { status: 'OPEN', tenantId: 'tenant-123' },
    });
  });

  // ── No tenant context ──────────────────────────────────────────

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

  it('should not inject tenantId for models without tenant column', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = { where: {} };

    await multiTenancyAllOperations({
      model: 'SupplierCategory',
      operation: 'findMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({ where: {} });
  });

  // ── CREATE operations ──────────────────────────────────────────

  it('should inject tenantId into create data', async () => {
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

  it('should inject tenantId into createMany with array data', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({ count: 2 });
    const args = {
      data: [{ name: 'Cat A' }, { name: 'Cat B' }],
    };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'createMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      data: [
        { name: 'Cat A', tenantId: 'tenant-123' },
        { name: 'Cat B', tenantId: 'tenant-123' },
      ],
    });
  });

  // ── UPDATE / DELETE operations ─────────────────────────────────

  it('should inject tenantId into update where clause', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Updated' });
    const args = {
      where: { id: 'cat-1' },
      data: { name: 'Updated' },
    };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'update',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { id: 'cat-1', tenantId: 'tenant-123' },
      data: { name: 'Updated' },
    });
  });

  it('should inject tenantId into delete where clause', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({ id: 'cat-1' });
    const args = { where: { id: 'cat-1' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'delete',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { id: 'cat-1', tenantId: 'tenant-123' },
    });
  });

  it('should inject tenantId into updateMany where clause', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({ count: 1 });
    const args = {
      where: { name: 'Old' },
      data: { name: 'New' },
    };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'updateMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { name: 'Old', tenantId: 'tenant-123' },
      data: { name: 'New' },
    });
  });

  it('should inject tenantId into deleteMany where clause', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue({ count: 1 });
    const args = { where: { name: 'Old' } };

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'deleteMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { name: 'Old', tenantId: 'tenant-123' },
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  it('should create empty where object if args.where is undefined', async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-123');
    const mockQuery = jest.fn().mockResolvedValue([]);
    const args = {};

    await multiTenancyAllOperations({
      model: 'Category',
      operation: 'findMany',
      args,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-123' },
    });
  });
});
