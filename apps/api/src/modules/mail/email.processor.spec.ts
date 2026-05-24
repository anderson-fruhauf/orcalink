import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';

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

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let prismaService: any;

  const mockPrismaService = {
    quotationSupplier: {
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
        EmailProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
    mockSend.mockClear();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should throw an error if QuotationSupplier is not found', async () => {
      prismaService.quotationSupplier.findUnique.mockResolvedValue(null);

      const job: any = { data: { quotationSupplierId: 'non-existent' } };

      await expect(processor.process(job)).rejects.toThrow(
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

      const job: any = { data: { quotationSupplierId: 'qs-1' } };

      await expect(processor.process(job)).rejects.toThrow(
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

      const job: any = { data: { quotationSupplierId: 'qs-1' } };

      const result = await processor.process(job);

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
        data: { sentAt: expect.any(Date) },
      });

      expect(result).toEqual({ id: 'resend-email-id-123' });
    });
  });
});
