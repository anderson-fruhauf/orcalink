/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { QuotationController } from './quotation.controller.js';
import { QuotationService } from './quotation.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';
import { QueryQuotationDto } from './dto/query-quotation.dto.js';
import { CreateQuotationItemDto } from './dto/create-quotation-item.dto.js';
import { AssociateSuppliersDto } from './dto/associate-suppliers.dto.js';

describe('QuotationController', () => {
  let controller: QuotationController;
  let service: QuotationService;

  const mockQuotationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    associateSuppliers: jest.fn(),
    publish: jest.fn(),
    resend: jest.fn(),
    close: jest.fn(),
    duplicate: jest.fn(),
  };

  const mockFirebaseAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };
  const mockPlanLimitGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationController],
      providers: [{ provide: QuotationService, useValue: mockQuotationService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockFirebaseAuthGuard)
      .overrideGuard(PlanLimitGuard)
      .useValue(mockPlanLimitGuard)
      .compile();

    controller = module.get<QuotationController>(QuotationController);
    service = module.get<QuotationService>(QuotationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call quotationService.create with dto', async () => {
      const dto: CreateQuotationDto = {
        title: 'Nova Cotação',
        deadline: '2026-06-01T12:00:00.000Z',
      };
      mockQuotationService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call quotationService.findAll with query parameters', async () => {
      const query: QueryQuotationDto = { page: 1, limit: 10, search: 'test' };
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockQuotationService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should call quotationService.findOne with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const expectedResult = { id, title: 'Quotation A' };
      mockQuotationService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call quotationService.update with id and dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const dto: UpdateQuotationDto = { title: 'Updated Quotation' };
      const expectedResult = { id, title: 'Updated Quotation' };
      mockQuotationService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should call quotationService.remove with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockQuotationService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('addItem', () => {
    it('should call quotationService.addItem with id and item dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const itemDto: CreateQuotationItemDto = {
        productId: 'prod-id-123',
        quantity: 10,
        notes: 'Obs',
      };
      mockQuotationService.addItem.mockResolvedValue({ id: 'qi-1', ...itemDto });

      const result = await controller.addItem(id, itemDto);

      expect(service.addItem).toHaveBeenCalledWith(id, itemDto);
      expect(result).toEqual({ id: 'qi-1', ...itemDto });
    });
  });

  describe('removeItem', () => {
    it('should call quotationService.removeItem with id and itemId', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const itemId = 'item-id-123';
      mockQuotationService.removeItem.mockResolvedValue(undefined);

      await controller.removeItem(id, itemId);

      expect(service.removeItem).toHaveBeenCalledWith(id, itemId);
    });
  });

  describe('associateSuppliers', () => {
    it('should call quotationService.associateSuppliers with id and suppliers dto', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const suppliersDto: AssociateSuppliersDto = {
        supplierIds: ['s-1', 's-2'],
      };
      mockQuotationService.associateSuppliers.mockResolvedValue({ id, suppliers: [] });

      const result = await controller.associateSuppliers(id, suppliersDto);

      expect(service.associateSuppliers).toHaveBeenCalledWith(id, suppliersDto);
      expect(result).toEqual({ id, suppliers: [] });
    });
  });

  describe('publish', () => {
    it('should call quotationService.publish with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockQuotationService.publish.mockResolvedValue({ id, status: 'OPEN' });

      const result = await controller.publish(id);

      expect(service.publish).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id, status: 'OPEN' });
    });
  });

  describe('resend', () => {
    it('should call quotationService.resend with id and supplierId', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      const supplierId = 's-1-uuid';
      mockQuotationService.resend.mockResolvedValue({ success: true });

      const result = await controller.resend(id, supplierId);

      expect(service.resend).toHaveBeenCalledWith(id, supplierId);
      expect(result).toEqual({ success: true });
    });
  });

  describe('close', () => {
    it('should call quotationService.close with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockQuotationService.close.mockResolvedValue({ id, status: 'CLOSED' });

      const result = await controller.close(id);

      expect(service.close).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id, status: 'CLOSED' });
    });
  });

  describe('duplicate', () => {
    it('should call quotationService.duplicate with id', async () => {
      const id = 'a8f58eb9-923f-4221-a7b3-2868ffb8214b';
      mockQuotationService.duplicate.mockResolvedValue({ id: 'new-id', status: 'DRAFT' });

      const result = await controller.duplicate(id);

      expect(service.duplicate).toHaveBeenCalledWith(id);
      expect(result).toEqual({ id: 'new-id', status: 'DRAFT' });
    });
  });
});
