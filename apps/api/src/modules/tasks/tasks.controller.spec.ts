/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller.js';
import { QuotationService } from '../quotation/quotation.service.js';
import { CloudTasksGuard } from './cloud-tasks.guard.js';

describe('TasksController', () => {
  let controller: TasksController;
  let quotationService: QuotationService;

  const mockQuotationService = {
    expireExpiredQuotations: jest.fn(),
  };

  const mockCloudTasksGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: QuotationService, useValue: mockQuotationService },
      ],
    })
      .overrideGuard(CloudTasksGuard)
      .useValue(mockCloudTasksGuard)
      .compile();

    controller = module.get<TasksController>(TasksController);
    quotationService = module.get<QuotationService>(QuotationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      expect(quotationService.expireExpiredQuotations).toHaveBeenCalled();
      expect(result).toEqual({ expiredCount: 3 });
    });
  });
});
