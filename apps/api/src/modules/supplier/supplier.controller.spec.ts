/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller.js';
import { SupplierService } from './supplier.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { QuerySupplierDto } from './dto/query-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

describe('SupplierController', () => {
  let controller: SupplierController;
  let service: SupplierService;

  const mockSupplierService = {
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
      controllers: [SupplierController],
      providers: [{ provide: SupplierService, useValue: mockSupplierService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockFirebaseAuthGuard)
      .overrideGuard(PlanLimitGuard)
      .useValue(mockPlanLimitGuard)
      .compile();

    controller = module.get<SupplierController>(SupplierController);
    service = module.get<SupplierService>(SupplierService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call supplierService.create with dto', async () => {
      const dto: CreateSupplierDto = {
        name: 'Supplier A',
        email: 'supplier.a@email.com',
        categoryIds: ['cat-1'],
      };
      mockSupplierService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call supplierService.findAll with query parameters', async () => {
      const query: QuerySupplierDto = { page: 1, limit: 10, search: 'test' };
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockSupplierService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should call supplierService.findOne with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const expectedResult = { id, name: 'Supplier A' };
      mockSupplierService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call supplierService.update with id and dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const dto: UpdateSupplierDto = { name: 'Updated Supplier' };
      const expectedResult = { id, name: 'Updated Supplier' };
      mockSupplierService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should call supplierService.remove with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockSupplierService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
