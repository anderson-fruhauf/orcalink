/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductUnit } from './dto/create-product.dto.js';

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: any;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quotationItem: {
      findFirst: jest.fn(),
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
        ProductService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();

    // Mock do transaction para executar diretamente o callback com o mockPrismaService
    prismaService.$transaction.mockImplementation((cb: any) =>
      cb(prismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Produto Teste',
      description: 'Descrição do produto',
      unit: ProductUnit.UN,
      internalCode: 'PROD-001',
      categoryId: 'category-id-123',
    };

    it('should throw NotFoundException if category does not exist', async () => {
      prismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('Categoria não encontrada'),
      );
      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-id-123' },
      });
    });

    it('should create product successfully if category exists', async () => {
      prismaService.category.findUnique.mockResolvedValue({
        id: 'category-id-123',
        name: 'Alimentos',
      });
      const mockCreatedProduct = { id: 'product-id-123', ...createDto };
      prismaService.product.create.mockResolvedValue(mockCreatedProduct);

      const result = await service.create(createDto);

      expect(prismaService.product.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          unit: createDto.unit,
          internalCode: createDto.internalCode,
          categoryId: createDto.categoryId,
          tenantId: '',
        },
      });
      expect(result).toEqual(mockCreatedProduct);
    });
  });

  describe('findAll', () => {
    it('should paginate and filter correctly', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Banana',
          unit: 'KG',
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Frutas' },
        },
      ];
      prismaService.product.findMany.mockResolvedValue(mockProducts);
      prismaService.product.count.mockResolvedValue(1);

      const query = {
        page: 1,
        limit: 10,
        search: 'banana',
        categoryId: 'cat-1',
      };
      const result = await service.findAll(query);

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'banana', mode: 'insensitive' },
          categoryId: 'cat-1',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
      expect(prismaService.product.count).toHaveBeenCalledWith({
        where: {
          name: { contains: 'banana', mode: 'insensitive' },
          categoryId: 'cat-1',
        },
      });
      expect(result).toEqual({
        data: mockProducts,
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
    it('should throw NotFoundException if product does not exist', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Produto não encontrado'),
      );
    });

    it('should return the product if found', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Banana',
        category: { id: 'cat-1', name: 'Frutas' },
      };
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Banana Prata',
      categoryId: 'new-cat-id',
    };

    it('should throw NotFoundException if product to update does not exist', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('prod-1', updateDto)).rejects.toThrow(
        new NotFoundException('Produto não encontrado'),
      );
    });

    it('should throw NotFoundException if product exists but new category does not exist', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Banana',
      });
      prismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update('prod-1', updateDto)).rejects.toThrow(
        new NotFoundException('Categoria não encontrada'),
      );
      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-cat-id' },
      });
    });

    it('should update product successfully', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Banana',
      });
      prismaService.category.findUnique.mockResolvedValue({
        id: 'new-cat-id',
        name: 'Frutas',
      });
      const updatedProduct = {
        id: 'prod-1',
        name: 'Banana Prata',
        categoryId: 'new-cat-id',
      };
      prismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update('prod-1', updateDto);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          name: updateDto.name,
          description: undefined,
          unit: undefined,
          internalCode: undefined,
          categoryId: updateDto.categoryId,
        },
      });
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if product to delete does not exist', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('prod-1')).rejects.toThrow(
        new NotFoundException('Produto não encontrado'),
      );
    });

    it('should throw ConflictException if product is linked to an active (OPEN) quotation', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Banana',
      });
      prismaService.quotationItem.findFirst.mockResolvedValue({
        id: 'q-item-1',
        quotationId: 'q-1',
      });

      await expect(service.remove('prod-1')).rejects.toThrow(
        new ConflictException(
          'Não é possível excluir um produto vinculado a uma cotação ativa (status OPEN).',
        ),
      );
      expect(prismaService.quotationItem.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          quotation: {
            status: 'OPEN',
          },
        },
      });
    });

    it('should clean up related items and delete product if not linked to any open quotations', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Banana',
      });
      prismaService.quotationItem.findFirst.mockResolvedValue(null);
      prismaService.product.delete.mockResolvedValue({
        id: 'prod-1',
        name: 'Banana',
      });

      const result = await service.remove('prod-1');

      expect(prismaService.quotationItem.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
      expect(prismaService.proposalItem.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
      expect(result).toEqual({ id: 'prod-1', name: 'Banana' });
    });
  });
});
