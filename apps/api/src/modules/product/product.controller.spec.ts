/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard.js';
import { CreateProductDto, ProductUnit } from './dto/create-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockFirebaseAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };
  const mockPlanLimitGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockFirebaseAuthGuard)
      .overrideGuard(PlanLimitGuard)
      .useValue(mockPlanLimitGuard)
      .compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call productService.create with dto', async () => {
      const dto: CreateProductDto = {
        name: 'Product A',
        unit: ProductUnit.UN,
        categoryId: 'cat-id-123',
      };
      mockProductService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call productService.findAll with query parameters', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, search: 'test' };
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockProductService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should call productService.findOne with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const expectedResult = { id, name: 'Product A' };
      mockProductService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call productService.update with id and dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const dto: UpdateProductDto = { name: 'Updated Product' };
      const expectedResult = { id, name: 'Updated Product' };
      mockProductService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should call productService.remove with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockProductService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
