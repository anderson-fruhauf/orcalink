jest.mock('@whiskeysockets/baileys', () => ({
  initAuthCreds: () => ({
    registrationId: 12345,
    noiseKey: {
      public: Buffer.from('public'),
      private: Buffer.from('private'),
    },
  }),
  BufferJSON: {
    replacer: (_key: string, value: unknown) => value,
    reviver: (_key: string, value: unknown) => value,
  },
  makeCacheableSignalKeyStore: (store: unknown) => store,
}));

import pino from 'pino';
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { makePrismaAuthState } from './prisma-auth-state.js';
import { encryptJson } from './whatsapp-crypto.js';

describe('makePrismaAuthState', () => {
  const tenantId = 'tenant-1';
  const logger = pino({ level: 'silent' });

  const mockPrisma = {
    whatsappSession: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    whatsappAuthKey: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'] =
      'test-encryption-key-for-whatsapp';
  });

  afterEach(() => {
    delete process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'];
  });

  it('should initialize empty creds when session does not exist', async () => {
    mockPrisma.whatsappSession.findUnique.mockResolvedValue(null);

    const { state } = await makePrismaAuthState(
      tenantId,
      mockPrisma as any,
      logger,
    );

    expect(state.creds).toBeDefined();
    expect(state.creds.noiseKey).toBeDefined();
  });

  it('should load creds from encrypted session', async () => {
    const creds = initAuthCreds();
    const serialized = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    mockPrisma.whatsappSession.findUnique.mockResolvedValue({
      creds: { data: encryptJson(serialized) },
    });
    mockPrisma.whatsappAuthKey.findMany.mockResolvedValue([]);

    const { state } = await makePrismaAuthState(
      tenantId,
      mockPrisma as any,
      logger,
    );

    expect(state.creds.registrationId).toBe(creds.registrationId);
  });

  it('should persist creds on saveCreds', async () => {
    mockPrisma.whatsappSession.findUnique.mockResolvedValue(null);
    mockPrisma.whatsappSession.upsert.mockResolvedValue({});

    const { saveCreds } = await makePrismaAuthState(
      tenantId,
      mockPrisma as any,
      logger,
    );

    await saveCreds();

    expect(mockPrisma.whatsappSession.upsert).toHaveBeenCalledWith({
      where: { tenantId },
      create: expect.objectContaining({
        tenantId,
        creds: expect.objectContaining({ data: expect.any(String) }),
      }),
      update: expect.objectContaining({
        creds: expect.objectContaining({ data: expect.any(String) }),
      }),
    });
  });

  it('should map auth keys get/set/clear to prisma', async () => {
    mockPrisma.whatsappSession.findUnique.mockResolvedValue(null);
    mockPrisma.whatsappAuthKey.findMany.mockResolvedValue([
      {
        keyId: 'key-1',
        value: { data: encryptJson({ test: true }) },
      },
    ]);
    mockPrisma.whatsappAuthKey.upsert.mockResolvedValue({});
    mockPrisma.whatsappAuthKey.deleteMany.mockResolvedValue({ count: 1 });

    const { state } = await makePrismaAuthState(
      tenantId,
      mockPrisma as any,
      logger,
    );

    const keys = state.keys as any;
    const loaded = await keys.get('session', ['key-1']);
    expect(loaded['key-1']).toEqual({ test: true });

    await keys.set({
      session: {
        'key-2': { foo: 'bar' },
        'key-3': null,
      },
    });

    expect(mockPrisma.whatsappAuthKey.upsert).toHaveBeenCalled();
    expect(mockPrisma.whatsappAuthKey.deleteMany).toHaveBeenCalledWith({
      where: { tenantId, category: 'session', keyId: 'key-3' },
    });
  });
});
