import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let prismaService: any;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    supplierCategory: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = { name: 'Categoria Teste' };

    it('should create a category', async () => {
      const mockCreated = { id: 'cat-id-123', name: createDto.name };
      prismaService.category.create.mockResolvedValue(mockCreated);

      const result = await service.create(createDto);

      expect(prismaService.category.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('findAll', () => {
    it('should paginate and filter categories', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Alimentos' }];
      prismaService.category.findMany.mockResolvedValue(mockCategories);
      prismaService.category.count.mockResolvedValue(1);

      const query = { page: 1, limit: 10, search: 'alim' };
      const result = await service.findAll(query);

      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'alim', mode: 'insensitive' } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: mockCategories,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should use default pagination when not provided', async () => {
      prismaService.category.findMany.mockResolvedValue([]);
      prismaService.category.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Categoria não encontrada'),
      );
      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should return category if found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Alimentos' };
      prismaService.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Nova' }),
      ).rejects.toThrow(new NotFoundException('Categoria não encontrada'));
    });

    it('should update category', async () => {
      prismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Alimentos',
      });
      const updated = { id: 'cat-1', name: 'Bebidas' };
      prismaService.category.update.mockResolvedValue(updated);

      const result = await service.update('cat-1', { name: 'Bebidas' });

      expect(prismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: 'Bebidas' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.remove('cat-1')).rejects.toThrow(
        new NotFoundException('Categoria não encontrada'),
      );
    });

    it('should throw ConflictException if category has linked products', async () => {
      prismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Alimentos',
      });
      prismaService.product.count.mockResolvedValue(3);

      await expect(service.remove('cat-1')).rejects.toThrow(
        new ConflictException(
          'Não é possível excluir uma categoria com produtos vinculados.',
        ),
      );
    });

    it('should throw ConflictException if category has linked suppliers', async () => {
      prismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Alimentos',
      });
      prismaService.product.count.mockResolvedValue(0);
      prismaService.supplierCategory.count.mockResolvedValue(2);

      await expect(service.remove('cat-1')).rejects.toThrow(
        new ConflictException(
          'Não é possível excluir uma categoria com fornecedores vinculados.',
        ),
      );
    });

    it('should delete category', async () => {
      prismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Alimentos',
      });
      prismaService.product.count.mockResolvedValue(0);
      prismaService.supplierCategory.count.mockResolvedValue(0);
      prismaService.category.delete.mockResolvedValue({
        id: 'cat-1',
        name: 'Alimentos',
      });

      const result = await service.remove('cat-1');

      expect(prismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(result).toEqual({ id: 'cat-1', name: 'Alimentos' });
    });
  });
});
