import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock Resend SDK
const mockSend = jest
  .fn()
  .mockResolvedValue({ data: { id: 'resend-email-id-123' }, error: null });
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: mockSend,
        },
      };
    }),
  };
});

describe('MailService', () => {
  let service: MailService;
  let prismaService: any;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    quotationSupplier: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    magicLink: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
    mockSend.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkEmailLimit', () => {
    it('should throw NotFoundException if tenant is not found', async () => {
      prismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.checkEmailLimit('non-existent', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass without error if tenant plan is PRO', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        plan: 'PRO',
      });

      await expect(
        service.checkEmailLimit('tenant-1', 50),
      ).resolves.not.toThrow();
      expect(prismaService.quotationSupplier.count).not.toHaveBeenCalled();
    });

    it('should pass if FREE plan limit is not exceeded', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        plan: 'FREE',
      });
      prismaService.quotationSupplier.count.mockResolvedValue(10); // 10 already sent

      await expect(
        service.checkEmailLimit('tenant-1', 5),
      ).resolves.not.toThrow();
      expect(prismaService.quotationSupplier.count).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if FREE plan limit is exceeded', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        plan: 'FREE',
      });
      prismaService.quotationSupplier.count.mockResolvedValue(18); // 18 already sent

      // 18 + 3 = 21 (which is > 20 limit)
      await expect(service.checkEmailLimit('tenant-1', 3)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('sendEmail', () => {
    it('should throw an error if QuotationSupplier is not found', async () => {
      prismaService.quotationSupplier.findUnique.mockResolvedValue(null);

      await expect(service.sendEmail('non-existent')).rejects.toThrow(
        'QuotationSupplier association not found for ID: non-existent',
      );
    });

    it('should throw an error if active MagicLink is not found', async () => {
      const mockQs = {
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
        quotation: {
          tenantId: 'tenant-1',
          title: 'Cotação de Teste',
          deadline: new Date(),
          tenant: { name: 'Comprador Ltda' },
          items: [],
        },
        supplier: {
          name: 'Fornecedor A',
          email: 'fornecedor@email.com',
          contactName: 'José',
        },
      };

      prismaService.quotationSupplier.findUnique.mockResolvedValue(mockQs);
      prismaService.magicLink.findFirst.mockResolvedValue(null);

      await expect(service.sendEmail('qs-1')).rejects.toThrow(
        'Active MagicLink not found for supplier s-1 on quotation q-1',
      );
    });

    it('should compile template, send email, and update sentAt upon success', async () => {
      const mockQs = {
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
        quotation: {
          tenantId: 'tenant-1',
          title: 'Cotação de Teste',
          deadline: new Date('2026-06-01T15:00:00Z'),
          tenant: { name: 'Comprador Ltda' },
          items: [
            {
              product: { name: 'Produto 1', unit: 'UN' },
              quantity: 10,
              observation: 'Urgent',
            },
            {
              product: { name: 'Produto 2', unit: 'KG' },
              quantity: 20,
              observation: null,
            },
            {
              product: { name: 'Produto 3', unit: 'LT' },
              quantity: 30,
              observation: null,
            },
            {
              product: { name: 'Produto 4', unit: 'UN' },
              quantity: 40,
              observation: null,
            },
            {
              product: { name: 'Produto 5', unit: 'UN' },
              quantity: 50,
              observation: null,
            },
            {
              product: { name: 'Produto 6', unit: 'UN' },
              quantity: 60,
              observation: null,
            },
          ],
        },
        supplier: {
          name: 'Fornecedor A',
          email: 'fornecedor@email.com',
          contactName: 'José',
        },
      };

      const mockMagicLink = {
        id: 'ml-1',
        token: 'magic-token-abc',
      };

      prismaService.quotationSupplier.findUnique.mockResolvedValue(mockQs);
      prismaService.magicLink.findFirst.mockResolvedValue(mockMagicLink);
      prismaService.quotationSupplier.update.mockResolvedValue({});

      // Spy on TenantContext.run to check context scoping
      const runSpy = jest.spyOn(TenantContext, 'run');

      await service.sendEmail('qs-1');

      expect(runSpy).toHaveBeenCalledWith('tenant-1', expect.any(Function));
      expect(mockSend).toHaveBeenCalledWith({
        from: 'Orçalink <onboarding@resend.dev>',
        to: ['fornecedor@email.com'],
        subject: 'Solicitação de Cotação: Cotação de Teste - Comprador Ltda',
        html: expect.stringContaining('José'),
      });

      // Verify template items list rendering
      const htmlBody = mockSend.mock.calls[0][0].html;
      expect(htmlBody).toContain('Produto 1');
      expect(htmlBody).toContain('Produto 5');
      expect(htmlBody).not.toContain('Produto 6'); // Since only max 5 display items
      expect(htmlBody).toContain('+ 1 item'); // Capped count check
      expect(htmlBody).toContain('magic-token-abc'); // Magic Link token in CTA

      // Verify DB update
      expect(prismaService.quotationSupplier.update).toHaveBeenCalledWith({
        where: { id: 'qs-1' },
        data: {
          sentAt: expect.any(Date),
          dispatchStatus: 'SENT',
          emailError: null,
        },
      });
    });
  });
});
