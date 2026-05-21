/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getStats: jest.fn(),
  };

  const mockFirebaseAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockFirebaseAuthGuard)
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should delegate to DashboardService.getStats', async () => {
      const stats = {
        activeQuotations: 3,
        totalSuppliers: 8,
        totalProducts: 12,
        pendingProposals: 1,
      };
      mockDashboardService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });
});
