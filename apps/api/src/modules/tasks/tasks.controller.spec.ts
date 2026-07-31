/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller.js';
import { QuotationService } from '../quotation/quotation.service.js';
import { CloudTasksGuard } from './cloud-tasks.guard.js';
import { TasksService } from './tasks.service.js';

describe('TasksController', () => {
  let controller: TasksController;

  const mockQuotationService = {
    expireExpiredQuotations: jest.fn(),
  };

  const mockTasksService = {
    handleEmailDispatch: jest.fn(),
    handleWhatsappDispatch: jest.fn(),
  };

  const mockCloudTasksGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: QuotationService, useValue: mockQuotationService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    })
      .overrideGuard(CloudTasksGuard)
      .useValue(mockCloudTasksGuard)
      .compile();

    controller = module.get<TasksController>(TasksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('emailDispatch', () => {
    it('deve delegar ao TasksService', async () => {
      mockTasksService.handleEmailDispatch.mockResolvedValue({
        status: 'sent',
      });

      const request = {
        headers: {
          'x-cloudtasks-taskretrycount': '1',
          'x-cloudtasks-taskname': 'projects/x/tasks/abc',
        },
      } as any;

      const result = await controller.emailDispatch(
        {
          tenantId: 't-1',
          quotationSupplierId: 'qs-1',
        },
        request,
      );

      expect(mockTasksService.handleEmailDispatch).toHaveBeenCalledWith({
        tenantId: 't-1',
        quotationSupplierId: 'qs-1',
      });
      expect(result).toEqual({ status: 'sent' });
    });
  });

  describe('whatsappDispatch', () => {
    it('deve delegar ao TasksService', async () => {
      mockTasksService.handleWhatsappDispatch.mockResolvedValue({
        status: 'processed',
        sent: 1,
        fallback: 0,
      });

      const request = { headers: {} } as any;
      const result = await controller.whatsappDispatch(
        {
          tenantId: 't-1',
          quotationId: 'q-1',
          quotationSupplierIds: ['qs-1'],
        },
        request,
      );

      expect(result.sent).toBe(1);
    });
  });

  describe('expireQuotations', () => {
    it('deve chamar expireExpiredQuotations e retornar o resultado', async () => {
      mockQuotationService.expireExpiredQuotations.mockResolvedValue({
        expiredCount: 3,
      });

      const request = {
        headers: {
          'x-cloudtasks-taskretrycount': '0',
          'x-cloudtasks-taskname': 'projects/x/tasks/abc',
        },
      } as any;

      const result = await controller.expireQuotations(request);

      expect(mockQuotationService.expireExpiredQuotations).toHaveBeenCalled();
      expect(result).toEqual({ expiredCount: 3 });
    });
  });
});
