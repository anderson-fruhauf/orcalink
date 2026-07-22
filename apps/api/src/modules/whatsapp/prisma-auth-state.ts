import {
  BufferJSON,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import type { Logger } from 'pino';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import { decryptJson, encryptJson } from './whatsapp-crypto.js';

type EncryptedPayload = { data: string };

function parseEncryptedField(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }
  const payload = value as EncryptedPayload;
  if (typeof payload.data !== 'string') {
    return value;
  }
  return decryptJson<unknown>(payload.data);
}

function toEncryptedField(value: unknown): EncryptedPayload {
  return { data: encryptJson(value) };
}

export async function makePrismaAuthState(
  tenantId: string,
  prisma: PrismaService,
  logger: Logger,
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  flushPendingWrites: () => Promise<void>;
}> {
  const session = await TenantContext.run(tenantId, () =>
    prisma.whatsappSession.findUnique({
      where: { tenantId },
    }),
  );

  let creds: AuthenticationCreds;
  if (session?.creds) {
    const parsed = parseEncryptedField(session.creds);
    creds = JSON.parse(JSON.stringify(parsed), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  let pendingWrites: Promise<void> = Promise.resolve();

  const runSerialized = (operation: () => Promise<void>): Promise<void> => {
    pendingWrites = pendingWrites.then(() =>
      TenantContext.run(tenantId, operation),
    );
    return pendingWrites;
  };

  const keyStore = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[],
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      return TenantContext.run(tenantId, async () => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        if (ids.length === 0) {
          return result;
        }

        const rows = await prisma.whatsappAuthKey.findMany({
          where: {
            tenantId,
            category: type,
            keyId: { in: ids },
          },
        });

        for (const row of rows) {
          const parsed = parseEncryptedField(row.value);
          result[row.keyId] = JSON.parse(
            JSON.stringify(parsed),
            BufferJSON.reviver,
          ) as SignalDataTypeMap[T];
        }

        return result;
      });
    },

    set: async (data: SignalDataSet): Promise<void> => {
      await runSerialized(async () => {
        for (const category of Object.keys(
          data,
        ) as (keyof SignalDataTypeMap)[]) {
          const entries = data[category];
          if (!entries) continue;

          for (const [keyId, value] of Object.entries(entries)) {
            if (value === null) {
              await prisma.whatsappAuthKey.deleteMany({
                where: { tenantId, category, keyId },
              });
              continue;
            }

            const serialized = JSON.parse(
              JSON.stringify(value, BufferJSON.replacer),
            );

            await prisma.whatsappAuthKey.upsert({
              where: {
                tenantId_category_keyId: { tenantId, category, keyId },
              },
              create: {
                tenantId,
                category,
                keyId,
                value: toEncryptedField(serialized),
              },
              update: {
                value: toEncryptedField(serialized),
              },
            });
          }
        }
      });
    },
  };

  const saveCreds = async (): Promise<void> => {
    await runSerialized(async () => {
      const serialized = JSON.parse(
        JSON.stringify(creds, BufferJSON.replacer),
      );

      await prisma.whatsappSession.upsert({
        where: { tenantId },
        create: {
          tenantId,
          creds: toEncryptedField(serialized),
        },
        update: {
          creds: toEncryptedField(serialized),
        },
      });
    });
  };

  const flushPendingWrites = async (): Promise<void> => {
    await pendingWrites;
  };

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(keyStore, logger),
    },
    saveCreds,
    flushPendingWrites,
  };
}
