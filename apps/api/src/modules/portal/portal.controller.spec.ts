/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';
import { SubmitProposalDto } from './dto/submit-proposal.dto.js';

describe('PortalController', () => {
  let controller: PortalController;
  let service: PortalService;

  const mockPortalService = {
    getQuotationByToken: jest.fn(),
    submitProposal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [{ provide: PortalService, useValue: mockPortalService }],
    }).compile();

    controller = module.get<PortalController>(PortalController);
    service = module.get<PortalService>(PortalService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuotation', () => {
    it('should call portalService.getQuotationByToken with token', async () => {
      const mockResult = {
        companyName: 'Empresa ABC',
        quotationTitle: 'Suprimentos Q2',
        deadline: '2026-06-01',
        daysRemaining: 14,
        status: 'open',
        items: [],
        alreadyResponded: false,
      };
      mockPortalService.getQuotationByToken.mockResolvedValue(mockResult);

      const result = await controller.getQuotation('test-token');

      expect(service.getQuotationByToken).toHaveBeenCalledWith('test-token');
      expect(result).toEqual(mockResult);
    });
  });

  describe('submitProposal', () => {
    it('should call portalService.submitProposal with token and dto', async () => {
      const dto: SubmitProposalDto = {
        deliveryDays: 5,
        paymentCondition: 'Faturado 30 dias',
        notes: 'Entrega parcial ok',
        items: [
          { quotationItemId: 'qi-1', priceInCents: 15000, unavailable: false },
        ],
      };
      const mockResult = { id: 'prop-123' };
      mockPortalService.submitProposal.mockResolvedValue(mockResult);

      const result = await controller.submitProposal('test-token', dto);

      expect(service.submitProposal).toHaveBeenCalledWith('test-token', dto);
      expect(result).toEqual(mockResult);
    });
  });
});
