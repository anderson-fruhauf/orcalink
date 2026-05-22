/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { QueryCategoryDto } from './dto/query-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
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
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockFirebaseAuthGuard)
      .overrideGuard(PlanLimitGuard)
      .useValue(mockPlanLimitGuard)
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call categoryService.create with dto', async () => {
      const dto: CreateCategoryDto = { name: 'Alimentos' };
      mockCategoryService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call categoryService.findAll with query', async () => {
      const query: QueryCategoryDto = { page: 1, limit: 10, search: 'test' };
      const expected = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      mockCategoryService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call categoryService.findOne with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const expected = { id, name: 'Alimentos' };
      mockCategoryService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call categoryService.update with id and dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const dto: UpdateCategoryDto = { name: 'Bebidas' };
      const expected = { id, name: 'Bebidas' };
      mockCategoryService.update.mockResolvedValue(expected);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockCategoryService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
