import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from './supplier.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SupplierService', () => {
  let service: SupplierService;
  let prismaService: any;

  const mockPrismaService = {
    category: {
      findMany: jest.fn(),
    },
    supplier: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    supplierCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    quotationSupplier: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    magicLink: {
      deleteMany: jest.fn(),
    },
    proposal: {
      deleteMany: jest.fn(),
    },
    proposalItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();

    prismaService.$transaction.mockImplementation((cb: any) =>
      cb(prismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Fornecedor A',
      email: 'fornecedor.a@email.com',
      document: '12345678901',
      contactName: 'Contato A',
      phone: '999999999',
      categoryIds: ['cat-1', 'cat-2'],
    };

    it('should throw NotFoundException if one or more categories do not exist', async () => {
      prismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('Uma ou mais categorias não foram encontradas'),
      );
      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-1', 'cat-2'] } },
      });
    });

    it('should create supplier and links category pivots successfully', async () => {
      prismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1' },
        { id: 'cat-2' },
      ]);
      const mockCreatedSupplier = {
        id: 'supp-1',
        name: createDto.name,
        email: createDto.email,
        document: createDto.document,
        contactName: createDto.contactName,
        phone: createDto.phone,
      };
      prismaService.supplier.create.mockResolvedValue(mockCreatedSupplier);
      prismaService.supplier.findUnique.mockResolvedValue({
        ...mockCreatedSupplier,
        categories: [
          { category: { id: 'cat-1', name: 'Cat 1' } },
          { category: { id: 'cat-2', name: 'Cat 2' } },
        ],
      });

      const result = await service.create(createDto);

      expect(prismaService.supplier.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          document: createDto.document,
          contactName: createDto.contactName,
          email: createDto.email,
          phone: createDto.phone,
        },
      });
      expect(prismaService.supplierCategory.createMany).toHaveBeenCalledWith({
        data: [
          { supplierId: 'supp-1', categoryId: 'cat-1' },
          { supplierId: 'supp-1', categoryId: 'cat-2' },
        ],
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('supp-1');
    });
  });

  describe('findAll', () => {
    it('should filter by search terms and category pivot', async () => {
      const mockSuppliers = [
        {
          id: 'supp-1',
          name: 'Fornecedor A',
          categories: [{ category: { id: 'cat-1', name: 'Cat 1' } }],
        },
      ];
      prismaService.supplier.findMany.mockResolvedValue(mockSuppliers);
      prismaService.supplier.count.mockResolvedValue(1);

      const query = {
        page: 1,
        limit: 10,
        search: 'fornecedor',
        categoryId: 'cat-1',
      };
      const result = await service.findAll(query);

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'fornecedor', mode: 'insensitive' } },
            { document: { contains: 'fornecedor', mode: 'insensitive' } },
            { contactName: { contains: 'fornecedor', mode: 'insensitive' } },
            { email: { contains: 'fornecedor', mode: 'insensitive' } },
          ],
          categories: {
            some: {
              categoryId: 'cat-1',
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      });
      expect(result).toEqual({
        data: mockSuppliers,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if supplier does not exist', async () => {
      prismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.findOne('supp-1')).rejects.toThrow(
        new NotFoundException('Fornecedor não encontrado'),
      );
    });

    it('should return supplier if found', async () => {
      const mockSupplier = { id: 'supp-1', name: 'Fornecedor A' };
      prismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findOne('supp-1');
      expect(prismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 'supp-1' },
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      });
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Fornecedor Atualizado',
      categoryIds: ['cat-2'],
    };

    it('should throw NotFoundException if supplier does not exist', async () => {
      prismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.update('supp-1', updateDto)).rejects.toThrow(
        new NotFoundException('Fornecedor não encontrado'),
      );
    });

    it('should throw NotFoundException if categoryIds contains invalid category', async () => {
      prismaService.supplier.findUnique.mockResolvedValue({ id: 'supp-1' });
      prismaService.category.findMany.mockResolvedValue([]);

      await expect(service.update('supp-1', updateDto)).rejects.toThrow(
        new NotFoundException('Uma ou mais categorias não foram encontradas'),
      );
    });

    it('should successfully update supplier and synchronize category pivots', async () => {
      prismaService.supplier.findUnique.mockResolvedValue({ id: 'supp-1' });
      prismaService.category.findMany.mockResolvedValue([{ id: 'cat-2' }]);
      prismaService.supplier.update.mockResolvedValue({ id: 'supp-1' });
      prismaService.supplierCategory.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.supplierCategory.createMany.mockResolvedValue({ count: 1 });

      await service.update('supp-1', updateDto);

      expect(prismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supp-1' },
        data: {
          name: updateDto.name,
          document: undefined,
          contactName: undefined,
          email: undefined,
          phone: undefined,
        },
      });
      expect(prismaService.supplierCategory.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'supp-1' },
      });
      expect(prismaService.supplierCategory.createMany).toHaveBeenCalledWith({
        data: [{ supplierId: 'supp-1', categoryId: 'cat-2' }],
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if supplier does not exist', async () => {
      prismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.remove('supp-1')).rejects.toThrow(
        new NotFoundException('Fornecedor não encontrado'),
      );
    });

    it('should throw ConflictException if supplier has pending proposal on open quotation', async () => {
      prismaService.supplier.findUnique.mockResolvedValue({ id: 'supp-1' });
      prismaService.quotationSupplier.findFirst.mockResolvedValue({
        id: 'qs-1',
      });

      await expect(service.remove('supp-1')).rejects.toThrow(
        new ConflictException(
          'Não é possível excluir um fornecedor com proposta pendente em uma cotação ativa (status OPEN).',
        ),
      );
      expect(prismaService.quotationSupplier.findFirst).toHaveBeenCalledWith({
        where: {
          supplierId: 'supp-1',
          responseStatus: 'PENDING',
          quotation: { status: 'OPEN' },
        },
      });
    });

    it('should cascade delete all records transactionally', async () => {
      prismaService.supplier.findUnique.mockResolvedValue({ id: 'supp-1' });
      prismaService.quotationSupplier.findFirst.mockResolvedValue(null);
      prismaService.supplier.delete.mockResolvedValue({ id: 'supp-1' });

      const result = await service.remove('supp-1');

      expect(prismaService.supplierCategory.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'supp-1' },
      });
      expect(prismaService.magicLink.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'supp-1' },
      });
      expect(prismaService.proposalItem.deleteMany).toHaveBeenCalledWith({
        where: { proposal: { supplierId: 'supp-1' } },
      });
      expect(prismaService.proposal.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'supp-1' },
      });
      expect(prismaService.quotationSupplier.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'supp-1' },
      });
      expect(prismaService.supplier.delete).toHaveBeenCalledWith({
        where: { id: 'supp-1' },
      });
      expect(result).toEqual({ id: 'supp-1' });
    });
  });
});
