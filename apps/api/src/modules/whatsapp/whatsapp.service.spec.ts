import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface.js';
import { PLAN_LIMIT_MESSAGE } from '../../common/constants/error-messages.js';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let provider: {
    pair: jest.Mock;
    disconnect: jest.Mock;
    withConnection: jest.Mock;
  };

  const mockPrisma = {
    tenant: { findUnique: jest.fn() },
    whatsappAuthKey: { deleteMany: jest.fn() },
    whatsappSession: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    quotationSupplier: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    magicLink: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    provider = {
      pair: jest.fn(),
      disconnect: jest.fn(),
      withConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHATSAPP_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = module.get(WhatsappService);
    jest.clearAllMocks();

    process.env['WHATSAPP_ENABLED'] = 'true';
    process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'] =
      'test-encryption-key-for-whatsapp';
  });

  afterEach(() => {
    delete process.env['WHATSAPP_ENABLED'];
    delete process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should throw when WhatsApp feature flag is disabled', async () => {
      process.env['WHATSAPP_ENABLED'] = 'false';

      await expect(service.getStatus('tenant-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should block access on FREE plan', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'FREE' });

      await expect(service.getStatus('tenant-1')).rejects.toThrow(
        new ForbiddenException(PLAN_LIMIT_MESSAGE),
      );
    });

    it('should return DISCONNECTED when session does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappSession.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('tenant-1');

      expect(result).toEqual({
        state: 'DISCONNECTED',
        connectedNumber: null,
        lastConnectedAt: null,
      });
    });

    it('should return current session status', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappSession.findUnique.mockResolvedValue({
        state: 'CONNECTED',
        connectedNumber: '+5511999999999',
        lastConnectedAt: new Date('2026-07-21T12:00:00.000Z'),
      });

      const result = await service.getStatus('tenant-1');

      expect(result.state).toBe('CONNECTED');
      expect(result.connectedNumber).toBe('+5511999999999');
      expect(result.lastConnectedAt).toBe('2026-07-21T12:00:00.000Z');
    });
  });

  describe('connect', () => {
    it('should emit QR and CONNECTED events on successful pairing', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappAuthKey.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.whatsappSession.upsert.mockResolvedValue({});
      mockPrisma.whatsappSession.update.mockResolvedValue({});
      provider.pair.mockImplementation(
        (_tenantId: string, onQr: (qr: string) => void) => {
          onQr('data:image/png;base64,mock');
          return Promise.resolve({ connectedNumber: '+5511999999999' });
        },
      );

      const events: string[] = [];

      await new Promise<void>((resolve, reject) => {
        service.connect('tenant-1').subscribe({
          next: (event) => {
            const payload =
              typeof event.data === 'string'
                ? event.data
                : JSON.stringify(event.data);
            events.push(payload);
          },
          error: reject,
          complete: resolve,
        });
      });

      expect(events).toHaveLength(3);
      expect(JSON.parse(events[0])).toEqual({
        type: 'STATUS',
        state: 'QR_PENDING',
      });
      expect(JSON.parse(events[1])).toEqual({
        type: 'QR',
        qrBase64: 'data:image/png;base64,mock',
      });
      expect(JSON.parse(events[2])).toEqual({
        type: 'CONNECTED',
        connectedNumber: '+5511999999999',
      });
      expect(mockPrisma.whatsappSession.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: expect.objectContaining({
          state: 'CONNECTED',
          connectedNumber: '+5511999999999',
        }),
      });
    });
  });

  describe('disconnect', () => {
    it('should clear session via provider', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      provider.disconnect.mockResolvedValue(undefined);

      const result = await service.disconnect('tenant-1');

      expect(provider.disconnect).toHaveBeenCalledWith('tenant-1');
      expect(result.state).toBe('DISCONNECTED');
    });
  });

  describe('sendQuotationMessages', () => {
    const whatsappSupplier = {
      id: 'qs-1',
      supplierId: 's-1',
      quotationId: 'q-1',
      channel: 'WHATSAPP',
      supplier: {
        phone: '11999999999',
        contactName: 'João',
        name: 'Fornecedor A',
      },
      quotation: {
        title: 'Cotação Teste',
        deadline: new Date('2026-08-01T12:00:00.000Z'),
        tenant: { name: 'Empresa X' },
      },
    };

    it('should send messages in a single connection', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappSession.findUnique.mockResolvedValue({
        state: 'CONNECTED',
        creds: { me: { id: '5511999999999' } },
      });
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        whatsappSupplier,
      ]);
      mockPrisma.magicLink.findFirst.mockResolvedValue({ token: 'abc123' });
      mockPrisma.quotationSupplier.update.mockResolvedValue({});

      provider.withConnection.mockImplementation(
        async (_tenantId: string, fn: (sock: any) => Promise<void>) => {
          const sock = {
            onWhatsApp: jest
              .fn()
              .mockResolvedValue([{ exists: true, jid: '5511999999999@s.whatsapp.net' }]),
            sendMessage: jest.fn().mockResolvedValue(undefined),
          };
          await fn(sock);
        },
      );

      const result = await service.sendQuotationMessages('tenant-1', 'q-1');

      expect(provider.withConnection).toHaveBeenCalledTimes(1);
      expect(result.sentIds).toEqual(['qs-1']);
      expect(result.fallbackToEmail).toEqual([]);
      expect(mockPrisma.quotationSupplier.update).toHaveBeenCalledWith({
        where: { id: 'qs-1' },
        data: expect.objectContaining({
          whatsappSentAt: expect.any(Date),
          whatsappError: null,
        }),
      });
    });

    it('should fallback to email when session is not connected', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappSession.findUnique.mockResolvedValue({
        state: 'DISCONNECTED',
        creds: null,
      });
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        whatsappSupplier,
      ]);
      mockPrisma.quotationSupplier.update.mockResolvedValue({});

      const result = await service.sendQuotationMessages('tenant-1', 'q-1');

      expect(provider.withConnection).not.toHaveBeenCalled();
      expect(result.sentIds).toEqual([]);
      expect(result.fallbackToEmail).toEqual(['qs-1']);
      expect(mockPrisma.quotationSupplier.update).toHaveBeenCalledWith({
        where: { id: 'qs-1' },
        data: { whatsappError: 'WHATSAPP_NOT_CONNECTED' },
      });
    });

    it('should fallback to email when supplier has invalid phone', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.whatsappSession.findUnique.mockResolvedValue({
        state: 'CONNECTED',
        creds: { me: { id: '5511999999999' } },
      });
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        {
          ...whatsappSupplier,
          supplier: { ...whatsappSupplier.supplier, phone: '123' },
        },
      ]);
      mockPrisma.quotationSupplier.update.mockResolvedValue({});

      const result = await service.sendQuotationMessages('tenant-1', 'q-1');

      expect(provider.withConnection).not.toHaveBeenCalled();
      expect(result.fallbackToEmail).toEqual(['qs-1']);
      expect(mockPrisma.quotationSupplier.update).toHaveBeenCalledWith({
        where: { id: 'qs-1' },
        data: { whatsappError: 'WHATSAPP_INVALID_PHONE' },
      });
    });

    it('should not allow sending on FREE plan', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'FREE' });
      mockPrisma.quotationSupplier.findMany.mockResolvedValue([
        whatsappSupplier,
      ]);
      mockPrisma.quotationSupplier.update.mockResolvedValue({});

      const result = await service.sendQuotationMessages('tenant-1', 'q-1');

      expect(provider.withConnection).not.toHaveBeenCalled();
      expect(result.fallbackToEmail).toEqual(['qs-1']);
    });
  });
});
