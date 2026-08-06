import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { WhatsappService } from '../whatsapp/whatsapp.service.js';
import { TASK_QUEUE } from './task-queue.interface.js';

describe('TasksService', () => {
  let service: TasksService;

  const mockPrisma = {
    quotationSupplier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMailService = {
    sendEmail: jest.fn(),
  };

  const mockWhatsappService = {
    sendQuotationMessages: jest.fn(),
  };

  const mockTaskQueue = {
    enqueue: jest.fn(),
    isHealthy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: TASK_QUEUE, useValue: mockTaskQueue },
      ],
    }).compile();

    service = module.get(TasksService);
    jest.clearAllMocks();
  });

  describe('handleEmailDispatch', () => {
    it('deve retornar already_sent quando dispatchStatus é SENT', async () => {
      mockPrisma.quotationSupplier.findFirst.mockResolvedValue({
        id: 'qs-1',
        dispatchStatus: 'SENT',
        supplier: { email: 'a@b.com' },
        quotation: { status: 'OPEN', tenantId: 't-1' },
      });

      const result = await service.handleEmailDispatch({
        tenantId: 't-1',
        quotationSupplierId: 'qs-1',
      });

      expect(result).toEqual({ status: 'already_sent' });
      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
    });

    it('deve marcar FAILED e retornar 200 semântico em falha permanente', async () => {
      mockPrisma.quotationSupplier.findFirst.mockResolvedValue({
        id: 'qs-1',
        dispatchStatus: 'QUEUED',
        supplier: { email: 'a@b.com' },
        quotation: { status: 'OPEN', tenantId: 't-1' },
      });
      mockMailService.sendEmail.mockRejectedValue(
        new Error('Active MagicLink not found for supplier'),
      );

      const result = await service.handleEmailDispatch({
        tenantId: 't-1',
        quotationSupplierId: 'qs-1',
      });

      expect(result).toEqual({ status: 'failed' });
      expect(mockPrisma.quotationSupplier.update).toHaveBeenCalledWith({
        where: { id: 'qs-1' },
        data: {
          dispatchStatus: 'FAILED',
          emailError: 'Active MagicLink not found for supplier',
        },
      });
    });

    it('deve lançar 5xx em falha transitória do Resend', async () => {
      mockPrisma.quotationSupplier.findFirst.mockResolvedValue({
        id: 'qs-1',
        dispatchStatus: 'QUEUED',
        supplier: { email: 'a@b.com' },
        quotation: { status: 'OPEN', tenantId: 't-1' },
      });
      mockMailService.sendEmail.mockRejectedValue(
        new Error('Resend failed to send email: timeout'),
      );

      await expect(
        service.handleEmailDispatch({
          tenantId: 't-1',
          quotationSupplierId: 'qs-1',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(mockPrisma.quotationSupplier.update).not.toHaveBeenCalled();
    });
  });

  describe('handleWhatsappDispatch', () => {
    it('deve enfileirar e-mail no fallback do WhatsApp', async () => {
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        { id: 'qs-1', whatsappSentAt: null, dispatchStatus: 'QUEUED' },
      ]);
      mockWhatsappService.sendQuotationMessages.mockResolvedValue({
        sentIds: [],
        fallbackToEmail: ['qs-1'],
      });

      const result = await service.handleWhatsappDispatch({
        tenantId: 't-1',
        quotationId: 'q-1',
        quotationSupplierIds: ['qs-1'],
        correlationId: 'corr-1',
      });

      expect(result).toEqual({
        status: 'processed',
        sent: 0,
        fallback: 1,
      });
      expect(mockTaskQueue.enqueue).toHaveBeenCalledWith(
        'email-dispatch',
        {
          tenantId: 't-1',
          quotationSupplierId: 'qs-1',
          correlationId: 'corr-1',
        },
        expect.objectContaining({
          dedupeKey: 'email-fallback:qs-1:corr-1',
        }),
      );
    });

    it('deve retornar already_sent quando todos já foram enviados', async () => {
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        {
          id: 'qs-1',
          whatsappSentAt: new Date(),
          dispatchStatus: 'SENT',
        },
      ]);

      const result = await service.handleWhatsappDispatch({
        tenantId: 't-1',
        quotationId: 'q-1',
        quotationSupplierIds: ['qs-1'],
      });

      expect(result).toEqual({
        status: 'already_sent',
        sent: 0,
        fallback: 0,
      });
      expect(mockWhatsappService.sendQuotationMessages).not.toHaveBeenCalled();
    });
  });
});
