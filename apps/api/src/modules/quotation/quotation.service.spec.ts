import { Test, TestingModule } from '@nestjs/testing';
import { QuotationService } from './quotation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('QuotationService', () => {
  let service: QuotationService;
  let prismaService: any;

  const mockMailService = {
    checkEmailLimit: jest.fn(),
    sendEmail: jest.fn(),
  };

  const mockPrismaService = {
    quotation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
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
    },
    magicLink: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
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
        { id: 's-1' },
        { id: 's-2' },
      ]);

      const result = await service.associateSuppliers('q-1', assocDto);

      expect(prismaService.quotationSupplier.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: 'q-1' },
      });
      expect(prismaService.quotationSupplier.createMany).toHaveBeenCalledWith({
        data: [
          { quotationId: 'q-1', supplierId: 's-1' },
          { quotationId: 'q-1', supplierId: 's-2' },
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
      const deadlineDate = new Date();
      prismaService.quotation.findUnique.mockResolvedValue({
        id: 'q-1',
        tenantId: 'tenant-123',
        status: 'DRAFT',
        deadline: deadlineDate,
        items: [{ id: 'qi-1' }],
        suppliers: [{ id: 'qs-1', supplierId: 's-1' }],
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
      expect(prismaService.magicLink.upsert).toHaveBeenCalled();
      expect(mockMailService.sendEmail).toHaveBeenCalledWith('qs-1');
      expect(result.status).toBe('OPEN');
    });
  });

  describe('resend', () => {
    it('should throw NotFoundException if quotation supplier association is not found', async () => {
      prismaService.quotationSupplier.findUnique.mockResolvedValue(null);

      await expect(service.resend('q-1', 's-1')).rejects.toThrow(
        new NotFoundException('Fornecedor não associado a esta cotação.'),
      );
    });

    it('should throw BadRequestException if quotation is not OPEN', async () => {
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

    it('should check limit, enqueue email and return success if valid', async () => {
      prismaService.quotationSupplier.findUnique.mockResolvedValue({
        id: 'qs-1',
        quotationId: 'q-1',
        supplierId: 's-1',
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
      expect(mockMailService.sendEmail).toHaveBeenCalledWith('qs-1');
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

  describe('duplicate', () => {
    it('should create new DRAFT quotation and copy all items', async () => {
      const original = {
        id: 'q-1',
        title: 'Original',
        deadline: new Date(),
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
          deadline: original.deadline,
          status: 'DRAFT',
        },
      });
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
  });
});
