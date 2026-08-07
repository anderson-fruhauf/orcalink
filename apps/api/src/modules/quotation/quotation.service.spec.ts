import { Test, TestingModule } from '@nestjs/testing';
import { QuotationService } from './quotation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TASK_QUEUE } from '../tasks/task-queue.interface.js';
import { getTomorrowBounds } from '../../common/utils/date.js';

describe('QuotationService', () => {
  let service: QuotationService;
  let prismaService: any;

  const mockMailService = {
    checkEmailLimit: jest.fn(),
    sendEmail: jest.fn(),
  };

  const mockTaskQueue = {
    enqueue: jest.fn(),
    isHealthy: jest.fn(),
  };

  const mockPrismaService = {
    quotation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    quotationItem: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    quotationSupplier: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    magicLink: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
        { provide: TASK_QUEUE, useValue: mockTaskQueue },
      ],
    }).compile();

    service = module.get<QuotationService>(QuotationService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();

    // Mock transaction implementation to run the callback directly
    prismaService.$transaction.mockImplementation((cb: any) =>
      cb(prismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a DRAFT quotation', async () => {
      const createDto = {
        title: 'Cotação de Alimentos',
        deadline: '2026-06-01T12:00:00.000Z',
      };
      const mockCreated = {
        id: 'q-id-123',
        ...createDto,
        deadline: new Date(createDto.deadline),
        status: 'DRAFT',
      };
      prismaService.quotation.create.mockResolvedValue(mockCreated);

      const result = await service.create(createDto);

      expect(prismaService.quotation.create).toHaveBeenCalledWith({
        data: {
          title: createDto.title,
          deadline: new Date(createDto.deadline),
          status: 'DRAFT',
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of quotations', async () => {
      const mockList = [
        {
          id: 'q-1',
          title: 'Cotação 1',
          status: 'DRAFT',
          _count: { items: 2, suppliers: 3 },
        },
      ];
      prismaService.quotation.findMany.mockResolvedValue(mockList);
      prismaService.quotation.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'cotacao',
        status: 'DRAFT',
      });

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith({
        where: {
          title: { contains: 'cotacao', mode: 'insensitive' },
          status: 'DRAFT',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { items: true, suppliers: true },
          },
        },
      });
      expect(result).toEqual({
        data: mockList,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if quotation does not exist', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Cotação não encontrada'),
      );
    });

    it('should return quotation detail with items and suppliers', async () => {
      const mockQuotation = {
        id: 'q-1',
        title: 'Cotação 1',
        items: [],
        suppliers: [],
      };
      prismaService.quotation.findUnique.mockResolvedValue(mockQuotation);

      const result = await service.findOne('q-1');

      expect(prismaService.quotation.findUnique).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  internalCode: true,
                },
              },
            },
          },
          suppliers: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  contactName: true,
                },
              },
            },
          },
          proposals: {
            include: {
              supplier: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          magicLinks: true,
        },
      });
      expect(result).toEqual(mockQuotation);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Novo Título' };

    it('should throw BadRequestException if quotation is not in DRAFT', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'OPEN',
      });

      await expect(service.update('q-1', updateDto)).rejects.toThrow(
        new BadRequestException(
          'Apenas cotações em rascunho podem ser editadas.',
        ),
      );
    });

    it('should update quotation fields successfully', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.quotation.update.mockResolvedValue({
        id: 'q-1',
        title: 'Novo Título',
      });

      const result = await service.update('q-1', updateDto);

      expect(prismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: {
          title: 'Novo Título',
          deadline: undefined,
        },
      });
      expect(result.title).toBe('Novo Título');
    });

    it('deve rejeitar deadline no passado', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });

      await expect(
        service.update('q-1', { deadline: '2020-01-01T12:00:00.000Z' }),
      ).rejects.toThrow(
        new BadRequestException('O prazo de resposta deve ser no futuro.'),
      );
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if quotation is not in DRAFT', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'CLOSED',
      });

      await expect(service.remove('q-1')).rejects.toThrow(
        new BadRequestException(
          'Apenas cotações em rascunho podem ser excluídas.',
        ),
      );
    });

    it('should execute transaction to delete quotation and cascade related records', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.quotation.delete.mockResolvedValue({ id: 'q-1' });

      await service.remove('q-1');

      expect(prismaService.quotationItem.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
      });
      expect(prismaService.magicLink.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
      });
      expect(prismaService.quotationSupplier.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
      });
      expect(prismaService.quotation.delete).toHaveBeenCalledWith({
        where: { id: 'q-1' },
      });
    });
  });

  describe('addItem', () => {
    const itemDto = { productId: 'p-1', quantity: 5, notes: 'Obs' };

    it('should throw BadRequestException if quotation is not in DRAFT', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'OPEN',
      });

      await expect(service.addItem('q-1', itemDto)).rejects.toThrow(
        new BadRequestException(
          'Apenas cotações em rascunho podem ser modificadas.',
        ),
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem('q-1', itemDto)).rejects.toThrow(
        new NotFoundException('Produto não encontrado.'),
      );
    });

    it('should upsert quotation item successfully', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.product.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaService.quotationItem.upsert.mockResolvedValue({ id: 'qi-1' });

      const result = await service.addItem('q-1', itemDto);

      expect(prismaService.quotationItem.upsert).toHaveBeenCalledWith({
        where: {
          quotationId_productId: {
            quotationId: 'q-1',
            productId: 'p-1',
          },
        },
        create: {
          quotationId: 'q-1',
          productId: 'p-1',
          quantity: 5,
          observation: 'Obs',
        },
        update: {
          quantity: 5,
          observation: 'Obs',
        },
      });
      expect(result).toEqual({ id: 'qi-1' });
    });
  });

  describe('removeItem', () => {
    it('should delete quotation item if it exists', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.quotationItem.findFirst.mockResolvedValue({ id: 'qi-1' });
      prismaService.quotationItem.delete.mockResolvedValue({ id: 'qi-1' });

      await service.removeItem('q-1', 'qi-1');

      expect(prismaService.quotationItem.delete).toHaveBeenCalledWith({
        where: { id: 'qi-1' },
      });
    });

    it('should throw NotFoundException if item does not exist in the quotation', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.quotationItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('q-1', 'qi-1')).rejects.toThrow(
        new NotFoundException('Item não encontrado.'),
      );
    });
  });

  describe('associateSuppliers', () => {
    const assocDto = { supplierIds: ['s-1', 's-2'] };

    it('should throw NotFoundException if any supplier is not found', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
      });
      prismaService.supplier.findMany.mockResolvedValue([{ id: 's-1' }]);

      await expect(service.associateSuppliers('q-1', assocDto)).rejects.toThrow(
        new NotFoundException('Um ou mais fornecedores não foram encontrados.'),
      );
    });

    it('should replace associations in transaction', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
        suppliers: [{ supplierId: 's-1' }, { supplierId: 's-2' }],
      });
      prismaService.supplier.findMany.mockResolvedValue([
        { id: 's-1', preferredChannel: 'EMAIL' },
        { id: 's-2', preferredChannel: 'WHATSAPP' },
      ]);

      const result = await service.associateSuppliers('q-1', assocDto);

      expect(prismaService.quotationSupplier.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
      });
      expect(prismaService.quotationSupplier.createMany).toHaveBeenCalledWith({
        data: [
          { quotationId: 'q-1', supplierId: 's-1', channel: 'EMAIL' },
          { quotationId: 'q-1', supplierId: 's-2', channel: 'WHATSAPP' },
        ],
      });
      expect(result.suppliers).toHaveLength(2);
    });
  });

  describe('publish', () => {
    it('should throw BadRequestException if quotation does not have items or suppliers', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
        items: [],
        suppliers: [{ supplierId: 's-1' }],
      });

      await expect(service.publish('q-1')).rejects.toThrow(
        new BadRequestException(
          'A cotação deve conter pelo menos um produto antes de ser publicada.',
        ),
      );

      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'DRAFT',
        items: [{ id: 'qi-1' }],
        suppliers: [],
      });

      await expect(service.publish('q-1')).rejects.toThrow(
        new BadRequestException(
          'A cotação deve ter pelo menos um fornecedor associado antes de ser publicada.',
        ),
      );
    });

    it('should update status to OPEN and generate magic links', async () => {
      const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 'tenant-123',
        status: 'DRAFT',
        deadline: deadlineDate,
        items: [{ id: 'qi-1' }],
        suppliers: [{ id: 'qs-1', supplierId: 's-1', channel: 'EMAIL' }],
      });
      prismaService.quotation.update.mockResolvedValue({
        id: 'q-1',
        status: 'OPEN',
      });

      const result = await service.publish('q-1');

      expect(mockMailService.checkEmailLimit).toHaveBeenCalledWith(
        'tenant-123',
        1,
      );
      expect(prismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { status: 'OPEN' },
      });
      expect(prismaService.magicLink.updateMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1', supplierId: 's-1', active: true },
        data: { active: false },
      });
      expect(prismaService.magicLink.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          quotationId: 'q-1',
          supplierId: 's-1',
          expiresAt: deadlineDate,
        },
      });
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'email-dispatch',
        expect.objectContaining({
          tenantId: 'tenant-123',
          quotationSupplierId: 'qs-1',
        }),
        expect.objectContaining({
          dedupeKey: expect.stringContaining('email:qs-1:'),
        }),
      );
      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(result.status).toBe('OPEN');
    });

    it('should enqueue whatsapp and email tasks without sending inline', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 'tenant-123',
        status: 'DRAFT',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: [{ id: 'qi-1' }],
        suppliers: [
          { id: 'qs-1', supplierId: 's-1', channel: 'WHATSAPP' },
          { id: 'qs-2', supplierId: 's-2', channel: 'EMAIL' },
        ],
      });
      prismaService.quotation.update.mockResolvedValue({
        id: 'q-1',
        status: 'OPEN',
      });

      await service.publish('q-1');

      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'email-dispatch',
        expect.objectContaining({
          tenantId: 'tenant-123',
          quotationSupplierId: 'qs-2',
        }),
        expect.any(Object),
      );
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'whatsapp-dispatch',
        expect.objectContaining({
          tenantId: 'tenant-123',
          quotationId: 'q-1',
          quotationSupplierIds: ['qs-1'],
        }),
        expect.any(Object),
      );
      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
    });

    it('deve rejeitar publicação quando o prazo já passou', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 'tenant-123',
        status: 'DRAFT',
        deadline: new Date('2020-01-01T12:00:00.000Z'),
        items: [{ id: 'qi-1' }],
        suppliers: [{ id: 'qs-1', supplierId: 's-1', channel: 'EMAIL' }],
      });

      await expect(service.publish('q-1')).rejects.toThrow(
        new BadRequestException(
          'O prazo de resposta deve ser no futuro. Atualize o prazo antes de publicar.',
        ),
      );
      expect(prismaService.quotation.update).not.toHaveBeenCalled();
    });
  });

  describe('resend', () => {
    const openQuotation = {
      id: 'q-1',
      status: 'OPEN',
      tenantId: 'tenant-123',
    };

    it('should throw NotFoundException if quotation belongs to another tenant', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(null);

      await expect(service.resend('q-1', 's-1')).rejects.toThrow(
        new NotFoundException('Cotação não encontrada'),
      );
      expect(prismaService.quotationSupplier.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if quotation supplier association is not found', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(openQuotation);
      prismaService.quotationSupplier.findUnique.mockResolvedValue(null);

      await expect(service.resend('q-1', 's-1')).rejects.toThrow(
        new NotFoundException('Fornecedor não associado a esta cotação.'),
      );
    });

    it('should throw BadRequestException if quotation is not OPEN', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(openQuotation);
      prismaService.quotationSupplier.findUnique.mockResolvedValue({
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
        quotation: {
          status: 'DRAFT',
        },
      });

      await expect(service.resend('q-1', 's-1')).rejects.toThrow(
        new BadRequestException(
          'Apenas cotações abertas podem ter e-mails reenviados.',
        ),
      );
    });

    it('should throw BadRequestException if supplier response status is not PENDING', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(openQuotation);
      prismaService.quotationSupplier.findUnique.mockResolvedValue({
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
        responseStatus: 'SUBMITTED',
        quotation: {
          status: 'OPEN',
        },
      });

      await expect(service.resend('q-1', 's-1')).rejects.toThrow(
        new BadRequestException(
          'Apenas convites com status pendente podem ser reenviados.',
        ),
      );
    });

    it('should check limit, enqueue invite and return success if valid', async () => {
      prismaService.quotation.findUnique.mockResolvedValue(openQuotation);
      prismaService.quotationSupplier.findUnique.mockResolvedValue({
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
        channel: 'WHATSAPP',
        responseStatus: 'PENDING',
        quotation: {
          tenantId: 'tenant-123',
          status: 'OPEN',
        },
      });

      const result = await service.resend('q-1', 's-1');

      expect(mockMailService.checkEmailLimit).toHaveBeenCalledWith(
        'tenant-123',
        1,
      );
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'whatsapp-dispatch',
        expect.objectContaining({
          tenantId: 'tenant-123',
          quotationId: 'q-1',
          quotationSupplierIds: ['qs-1'],
        }),
        expect.any(Object),
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('close', () => {
    it('should set status to CLOSED, deactivate links and mark pending as EXPIRED', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        status: 'OPEN',
      });
      prismaService.quotation.update.mockResolvedValue({
        id: 'q-1',
        status: 'CLOSED',
      });

      const result = await service.close('q-1');

      expect(prismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { status: 'CLOSED' },
      });
      expect(prismaService.magicLink.updateMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
        data: { active: false },
      });
      expect(prismaService.quotationSupplier.updateMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1', responseStatus: 'PENDING' },
        data: { responseStatus: 'EXPIRED' },
      });
      expect(result.status).toBe('CLOSED');
    });
  });

  describe('expireExpiredQuotations', () => {
    it('should close OPEN quotations past deadline and mark pending suppliers as EXPIRED', async () => {
      prismaService.quotation.findMany.mockResolvedValue([
        { id: 'q-1' },
        { id: 'q-2' },
      ]);
      prismaService.quotation.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.expireExpiredQuotations();

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'OPEN',
          deadline: { lt: expect.any(Date) },
        },
        select: { id: true },
      });
      expect(prismaService.quotation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['q-1', 'q-2'] }, status: 'OPEN' },
        data: { status: 'CLOSED' },
      });
      expect(prismaService.magicLink.updateMany).toHaveBeenCalledWith({
        where: { quotationId: { in: ['q-1', 'q-2'] } },
        data: { active: false },
      });
      expect(prismaService.quotationSupplier.updateMany).toHaveBeenCalledWith({
        where: {
          quotationId: { in: ['q-1', 'q-2'] },
          responseStatus: 'PENDING',
        },
        data: { responseStatus: 'EXPIRED' },
      });
      expect(result).toEqual({ expiredCount: 2 });
    });

    it('should return zero when there are no expired quotations', async () => {
      prismaService.quotation.findMany.mockResolvedValue([]);

      const result = await service.expireExpiredQuotations();

      expect(prismaService.quotation.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ expiredCount: 0 });
    });
  });

  describe('enqueueDeadlineReminders', () => {
    it('should enqueue one remind-quotation task per matching quotation', async () => {
      prismaService.quotation.findMany.mockResolvedValue([
        { id: 'q-1', tenantId: 't-1' },
        { id: 'q-2', tenantId: 't-2' },
      ]);

      const result = await service.enqueueDeadlineReminders();

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'OPEN',
          reminderSentAt: null,
          deadline: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
          suppliers: {
            some: {
              responseStatus: 'PENDING',
            },
          },
        },
        select: {
          id: true,
          tenantId: true,
        },
      });
      expect(mockTaskQueue.enqueue).toHaveBeenCalledTimes(2);
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'remind-quotation',
        { quotationId: 'q-1', tenantId: 't-1' },
        expect.objectContaining({
          dedupeKey: expect.stringMatching(/^remind:q-1:\d{4}-\d{2}-\d{2}$/),
        }),
      );
      expect(result).toEqual({ enqueuedCount: 2 });
    });
  });

  describe('sendDeadlineReminder', () => {
    const tomorrowDeadline = () => {
      const { start } = getTomorrowBounds();
      return new Date(start.getTime() + 12 * 60 * 60 * 1000);
    };

    it('should dispatch PENDING suppliers by channel and set reminderSentAt', async () => {
      const deadline = tomorrowDeadline();

      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 't-1',
        status: 'OPEN',
        reminderSentAt: null,
        deadline,
        suppliers: [
          { id: 'qs-email', channel: 'EMAIL' },
          { id: 'qs-wa', channel: 'WHATSAPP' },
          { id: 'qs-email-2', channel: 'EMAIL' },
        ],
      });

      const result = await service.sendDeadlineReminder('q-1');

      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'email-dispatch',
        expect.objectContaining({
          quotationSupplierId: 'qs-email',
          kind: 'reminder',
        }),
        expect.any(Object),
      );
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'email-dispatch',
        expect.objectContaining({
          quotationSupplierId: 'qs-email-2',
          kind: 'reminder',
        }),
        expect.any(Object),
      );
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'whatsapp-dispatch',
        expect.objectContaining({
          quotationId: 'q-1',
          quotationSupplierIds: ['qs-wa'],
          kind: 'reminder',
        }),
        expect.any(Object),
      );
      expect(prismaService.quotationSupplier.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['qs-email', 'qs-wa', 'qs-email-2'] } },
        data: {
          dispatchStatus: 'QUEUED',
          emailError: null,
          whatsappError: null,
          whatsappSentAt: null,
        },
      });
      expect(prismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { reminderSentAt: expect.any(Date) },
      });
      expect(result).toEqual({ status: 'enqueued', notified: 3 });
    });

    it('should skip when reminder already sent', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 't-1',
        status: 'OPEN',
        reminderSentAt: new Date(),
        deadline: tomorrowDeadline(),
        suppliers: [{ id: 'qs-1', channel: 'EMAIL' }],
      });

      const result = await service.sendDeadlineReminder('q-1');

      expect(mockTaskQueue.enqueue).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'already_reminded', notified: 0 });
    });

    it('should skip when deadline is outside tomorrow window', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 't-1',
        status: 'OPEN',
        reminderSentAt: null,
        deadline: new Date('2030-01-01T12:00:00.000Z'),
        suppliers: [{ id: 'qs-1', channel: 'EMAIL' }],
      });

      const result = await service.sendDeadlineReminder('q-1');

      expect(mockTaskQueue.enqueue).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'skipped_outside_window', notified: 0 });
    });

    it('should skip when there are no PENDING suppliers', async () => {
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 't-1',
        status: 'OPEN',
        reminderSentAt: null,
        deadline: tomorrowDeadline(),
        suppliers: [],
      });

      const result = await service.sendDeadlineReminder('q-1');

      expect(mockTaskQueue.enqueue).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'skipped_no_pending', notified: 0 });
    });
  });

  describe('duplicate', () => {
    it('should create new DRAFT quotation and copy all items', async () => {
      const original = {
        id: 'q-1',
        title: 'Original',
        deadline: new Date('2020-01-01T12:00:00.000Z'),
        items: [
          { productId: 'p-1', quantity: 10, observation: 'Notes 1' },
          { productId: 'p-2', quantity: 20, observation: 'Notes 2' },
        ],
      };
      prismaService.quotation.findUnique.mockResolvedValue(original);
      prismaService.quotation.create.mockResolvedValue({
        id: 'q-2',
        title: 'Original (Cópia)',
      });

      await service.duplicate('q-1');

      expect(prismaService.quotation.create).toHaveBeenCalledWith({
        data: {
          title: 'Original (Cópia)',
          deadline: expect.any(Date),
          status: 'DRAFT',
        },
      });
      const createArgs = prismaService.quotation.create.mock.calls[0][0];
      expect(createArgs.data.deadline.getTime()).toBeGreaterThan(Date.now());
      expect(createArgs.data.deadline).not.toEqual(original.deadline);
      expect(prismaService.quotationItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            quotationId: 'q-2',
            productId: 'p-1',
            quantity: 10,
            observation: 'Notes 1',
          },
          {
            quotationId: 'q-2',
            productId: 'p-2',
            quantity: 20,
            observation: 'Notes 2',
          },
        ],
      });
    });

    it('não deve copiar deadline passado da cotação original', async () => {
      const pastDeadline = new Date('2020-06-01T12:00:00.000Z');
      const original = {
        id: 'q-1',
        title: 'Cotação vencida',
        deadline: pastDeadline,
        items: [],
      };
      prismaService.quotation.findUnique.mockResolvedValue(original);
      prismaService.quotation.create.mockResolvedValue({
        id: 'q-2',
        title: 'Cotação vencida (Cópia)',
      });

      await service.duplicate('q-1');

      const createdDeadline =
        prismaService.quotation.create.mock.calls[0][0].data.deadline as Date;
      expect(createdDeadline.getTime()).toBeGreaterThan(Date.now());
      expect(createdDeadline.getTime()).not.toBe(pastDeadline.getTime());
    });
  });
});
