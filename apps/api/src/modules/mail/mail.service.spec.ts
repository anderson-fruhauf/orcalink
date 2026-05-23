import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MailService', () => {
  let service: MailService;
  let prismaService: any;
  let queueMock: any;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    quotationSupplier: {
      count: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'BullQueue_emails', useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    prismaService = module.get(PrismaService);
    queueMock = module.get('BullQueue_emails');

    jest.clearAllMocks();
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
      prismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', plan: 'PRO' });

      await expect(service.checkEmailLimit('tenant-1', 50)).resolves.not.toThrow();
      expect(prismaService.quotationSupplier.count).not.toHaveBeenCalled();
    });

    it('should pass if FREE plan limit is not exceeded', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', plan: 'FREE' });
      prismaService.quotationSupplier.count.mockResolvedValue(10); // 10 already sent

      await expect(service.checkEmailLimit('tenant-1', 5)).resolves.not.toThrow();
      expect(prismaService.quotationSupplier.count).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if FREE plan limit is exceeded', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', plan: 'FREE' });
      prismaService.quotationSupplier.count.mockResolvedValue(18); // 18 already sent

      // 18 + 3 = 21 (which is > 20 limit)
      await expect(service.checkEmailLimit('tenant-1', 3)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('enqueueEmail', () => {
    it('should add send-email job to queue with attempts and backoff options', async () => {
      await service.enqueueEmail('qs-uuid-123');

      expect(queueMock.add).toHaveBeenCalledWith(
        'send-email',
        { quotationSupplierId: 'qs-uuid-123' },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
    });
  });
});
