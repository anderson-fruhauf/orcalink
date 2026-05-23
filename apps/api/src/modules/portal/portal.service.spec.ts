/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { PortalService } from './portal.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SubmitProposalDto } from './dto/submit-proposal.dto.js';

describe('PortalService', () => {
  let service: PortalService;
  let prismaService: any;

  const mockPrismaService = {
    magicLink: {
      findUnique: jest.fn(),
    },
    proposal: {
      create: jest.fn(),
    },
    quotationSupplier: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();

    prismaService.$transaction.mockImplementation((cb: any) =>
      cb(prismaService),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQuotationByToken', () => {
    it('should return formatted quotation details for a valid token', async () => {
      const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5); // 5 days from now
      const mockLink = {
        id: 'ml-1',
        token: 'valid-token',
        active: true,
        expiresAt: deadline,
        quotationId: 'q-1',
        supplierId: 's-1',
        quotation: {
          id: 'q-1',
          title: 'Cotação Teste',
          status: 'OPEN',
          deadline,
          tenantId: 'tenant-123',
          tenant: { name: 'Empresa ABC' },
          items: [
            {
              id: 'qi-1',
              productId: 'p-1',
              quantity: 10,
              observation: 'Obs X',
              product: { name: 'Produto X', unit: 'Un' },
            },
          ],
        },
        supplier: { id: 's-1', name: 'Fornecedor XYZ' },
        proposal: null,
      };

      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      const result = await service.getQuotationByToken('valid-token');

      expect(prismaService.magicLink.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        include: expect.any(Object),
      });

      expect(result).toEqual({
        companyName: 'Empresa ABC',
        quotationTitle: 'Cotação Teste',
        deadline: deadline.toISOString().split('T')[0],
        daysRemaining: 5,
        status: 'open',
        items: [
          {
            id: 'qi-1',
            name: 'Produto X',
            unit: 'Un',
            quantity: 10,
            notes: 'Obs X',
            priceInCents: undefined,
            unavailable: undefined,
          },
        ],
        alreadyResponded: false,
        deliveryDays: undefined,
        paymentCondition: undefined,
        notes: undefined,
      });
    });

    it('should throw NotFoundException if token does not exist', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(null);

      await expect(service.getQuotationByToken('non-existent')).rejects.toThrow(
        new NotFoundException('Link inválido ou expirado'),
      );
    });

    it('should throw NotFoundException if link is inactive', async () => {
      const mockLink = {
        id: 'ml-1',
        token: 'inactive-token',
        active: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        quotation: { status: 'OPEN', deadline: new Date() },
        proposal: null,
      };
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      await expect(service.getQuotationByToken('inactive-token')).rejects.toThrow(
        new NotFoundException('Link inválido ou expirado'),
      );
    });

    it('should throw NotFoundException if link is expired', async () => {
      const mockLink = {
        id: 'ml-1',
        token: 'expired-token',
        active: true,
        expiresAt: new Date(Date.now() - 1000 * 60), // past
        quotation: { status: 'OPEN', deadline: new Date(Date.now() - 1000 * 60) },
        proposal: null,
      };
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      await expect(service.getQuotationByToken('expired-token')).rejects.toThrow(
        new NotFoundException('Link inválido ou expirado'),
      );
    });

    it('should throw NotFoundException if quotation status is DRAFT', async () => {
      const mockLink = {
        id: 'ml-1',
        token: 'draft-token',
        active: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        quotation: { status: 'DRAFT', deadline: new Date() },
        proposal: null,
      };
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      await expect(service.getQuotationByToken('draft-token')).rejects.toThrow(
        new NotFoundException('Link inválido ou expirado'),
      );
    });

    it('should return read-only data even if expired or closed, when already responded', async () => {
      const deadline = new Date(Date.now() - 1000 * 60 * 60); // expired
      const mockLink = {
        id: 'ml-1',
        token: 'responded-token',
        active: false,
        expiresAt: deadline,
        quotation: {
          id: 'q-1',
          title: 'Cotação Teste',
          status: 'CLOSED',
          deadline,
          tenantId: 'tenant-123',
          tenant: { name: 'Empresa ABC' },
          items: [
            {
              id: 'qi-1',
              productId: 'p-1',
              quantity: 10,
              observation: 'Obs X',
              product: { name: 'Produto X', unit: 'Un' },
            },
          ],
        },
        supplier: { id: 's-1', name: 'Fornecedor XYZ' },
        proposal: {
          deliveryDays: 3,
          paymentTerms: 'Pix à vista',
          notes: 'Nota fornecedor',
          items: [
            {
              productId: 'p-1',
              unitPrice: 12000,
              unavailable: false,
            },
          ],
        },
      };

      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      const result = await service.getQuotationByToken('responded-token');

      expect(result.alreadyResponded).toBe(true);
      expect(result.deliveryDays).toBe(3);
      expect(result.paymentCondition).toBe('Pix à vista');
      expect(result.notes).toBe('Nota fornecedor');
      expect(result.items[0].priceInCents).toBe(12000);
      expect(result.items[0].unavailable).toBe(false);
      expect(result.daysRemaining).toBe(0);
    });
  });

  describe('submitProposal', () => {
    const validDto: SubmitProposalDto = {
      deliveryDays: 5,
      paymentCondition: 'Faturado 30 dias',
      notes: 'Entrega parcial ok',
      items: [
        { quotationItemId: 'qi-1', priceInCents: 15000, unavailable: false },
        { quotationItemId: 'qi-2', priceInCents: null, unavailable: true },
      ],
    };

    const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const mockLink = {
      id: 'ml-1',
      token: 'submit-token',
      active: true,
      expiresAt: deadline,
      quotationId: 'q-1',
      supplierId: 's-1',
      quotation: {
        id: 'q-1',
        status: 'OPEN',
        tenantId: 'tenant-123',
        items: [
          { id: 'qi-1', productId: 'p-1' },
          { id: 'qi-2', productId: 'p-2' },
        ],
      },
      proposal: null,
    };

    it('should submit proposal successfully and update QuotationSupplier status', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);
      prismaService.proposal.create.mockResolvedValue({ id: 'prop-123' });
      prismaService.quotationSupplier.update.mockResolvedValue({ id: 'qs-1' });

      const result = await service.submitProposal('submit-token', validDto);

      expect(prismaService.proposal.create).toHaveBeenCalledWith({
        data: {
          quotationId: 'q-1',
          supplierId: 's-1',
          magicLinkId: 'ml-1',
          deliveryDays: 5,
          paymentTerms: 'Faturado 30 dias',
          notes: 'Entrega parcial ok',
          submittedAt: expect.any(Date),
          items: {
            create: [
              { productId: 'p-1', unitPrice: 15000, unavailable: false },
              { productId: 'p-2', unitPrice: 0, unavailable: true },
            ],
          },
        },
      });

      expect(prismaService.quotationSupplier.update).toHaveBeenCalledWith({
        where: {
          quotationId_supplierId: {
            quotationId: 'q-1',
            supplierId: 's-1',
          },
        },
        data: {
          responseStatus: 'SUBMITTED',
        },
      });

      expect(result).toEqual({ id: 'prop-123' });
    });

    it('should throw ConflictException if already submitted', async () => {
      const respondedLink = {
        ...mockLink,
        proposal: { id: 'existing-prop' },
      };
      prismaService.magicLink.findUnique.mockResolvedValue(respondedLink);

      await expect(service.submitProposal('submit-token', validDto)).rejects.toThrow(
        new ConflictException('Proposta já enviada para esta cotação'),
      );
    });

    it('should throw NotFoundException if token is expired/invalid', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(null);

      await expect(service.submitProposal('invalid-token', validDto)).rejects.toThrow(
        new NotFoundException('Link inválido ou expirado'),
      );
    });

    it('should throw BadRequestException if submitted items do not match quotation items count', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      const invalidDto: SubmitProposalDto = {
        ...validDto,
        items: [{ quotationItemId: 'qi-1', priceInCents: 10000, unavailable: false }],
      };

      await expect(service.submitProposal('submit-token', invalidDto)).rejects.toThrow(
        new BadRequestException('Todos os itens da cotação devem ser preenchidos.'),
      );
    });

    it('should throw BadRequestException if submitted item has invalid quotationItemId', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      const invalidDto: SubmitProposalDto = {
        ...validDto,
        items: [
          { quotationItemId: 'qi-1', priceInCents: 10000, unavailable: false },
          { quotationItemId: 'qi-invalid', priceInCents: 10000, unavailable: false },
        ],
      };

      await expect(service.submitProposal('submit-token', invalidDto)).rejects.toThrow(
        new BadRequestException('Item inválido na proposta: qi-invalid'),
      );
    });

    it('should throw BadRequestException if pricing is missing and not marked as unavailable', async () => {
      prismaService.magicLink.findUnique.mockResolvedValue(mockLink);

      const invalidDto: SubmitProposalDto = {
        ...validDto,
        items: [
          { quotationItemId: 'qi-1', priceInCents: null, unavailable: false },
          { quotationItemId: 'qi-2', priceInCents: null, unavailable: true },
        ],
      };

      await expect(service.submitProposal('submit-token', invalidDto)).rejects.toThrow(
        new BadRequestException(
          'Todos os itens devem ter um preço maior que zero ou ser marcados como indisponíveis.',
        ),
      );
    });
  });
});
