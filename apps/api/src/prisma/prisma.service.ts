import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TenantContext } from '../common/context/tenant-context.js';

/**
 * Lista de models que possuem coluna `tenantId`.
 * Toda query nesses models terá tenantId injetado automaticamente
 * quando houver um TenantContext ativo.
 */
const MODELS_WITH_TENANT = [
  'User',
  'Category',
  'Product',
  'Supplier',
  'Quotation',
  'WhatsappSession',
  'WhatsappAuthKey',
];

/**
 * Middleware de multi-tenancy que injeta `tenantId` automaticamente
 * em todas as operações dos models listados em MODELS_WITH_TENANT.
 *
 * - Operações de leitura (findFirst, findMany, findUnique, count, aggregate, groupBy):
 *   → Injeta `tenantId` no `where`
 * - create: → Injeta `tenantId` no `data`
 * - createMany: → Injeta `tenantId` em cada item do `data`
 * - update, delete: → Injeta `tenantId` no `where` (query engine filtra pela coluna)
 * - updateMany, deleteMany: → Injeta `tenantId` no `where`
 */
export const multiTenancyAllOperations = async ({
  model,
  operation,
  args,
  query,
}: any) => {
  const tenantId = TenantContext.getTenantId();

  if (tenantId && MODELS_WITH_TENANT.includes(model)) {
    if (operation === 'create') {
      args.data = args.data || {};
      args.data.tenantId = tenantId;
    } else if (operation === 'createMany') {
      if (Array.isArray(args.data)) {
        args.data = args.data.map((item: any) => ({
          ...item,
          tenantId,
        }));
      } else if (args.data) {
        args.data.tenantId = tenantId;
      }
    } else {
      // Todas as operações de leitura, update, delete, updateMany, deleteMany:
      // injeta tenantId no where.
      // Para findUnique/update/delete, o Prisma 5+ aceita campos adicionais
      // no where além dos campos únicos (extended where).
      args.where = args.where || {};
      args.where.tenantId = tenantId;
    }
  }

  return await query(args);
};

export const multiTenancyExtension = Prisma.defineExtension({
  name: 'multi-tenancy',
  query: {
    $allModels: {
      $allOperations: multiTenancyAllOperations,
    },
  },
});

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _baseClient: PrismaClient;
  private readonly _extendedClient: any;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL']!,
    });
    const adapter = new PrismaPg(pool);

    // Um único PrismaClient com a extensão de multi-tenancy aplicada.
    this._baseClient = new PrismaClient({ adapter });
    this._extendedClient = this._baseClient.$extends(multiTenancyExtension);
  }

  // ─── Model Delegates (via extended client) ───────────────────────
  get user() {
    return this._extendedClient.user;
  }
  get cleanUser() {
    return this._baseClient.user;
  }
  get category() {
    return this._extendedClient.category;
  }
  get product() {
    return this._extendedClient.product;
  }
  get supplier() {
    return this._extendedClient.supplier;
  }
  get quotation() {
    return this._extendedClient.quotation;
  }
  get tenant() {
    return this._extendedClient.tenant;
  }
  get supplierCategory() {
    return this._extendedClient.supplierCategory;
  }
  get quotationItem() {
    return this._extendedClient.quotationItem;
  }
  get quotationSupplier() {
    return this._extendedClient.quotationSupplier;
  }
  get magicLink() {
    return this._extendedClient.magicLink;
  }
  get proposal() {
    return this._extendedClient.proposal;
  }
  get proposalItem() {
    return this._extendedClient.proposalItem;
  }
  get whatsappSession() {
    return this._extendedClient.whatsappSession;
  }
  get whatsappAuthKey() {
    return this._extendedClient.whatsappAuthKey;
  }

  // ─── $transaction delega para o extended client ──────────────────
  async $transaction(args: any, options?: any): Promise<any> {
    return await this._extendedClient.$transaction(args, options);
  }

  // ─── Health check ────────────────────────────────────────────────
  async isHealthy(): Promise<boolean> {
    try {
      await this._baseClient.$executeRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────
  onModuleInit(): void {
    // Conecta em background sem travar o boot da aplicação e do probe TCP no Cloud Run.
    // Se o banco (ex: Neon ou Supabase) estiver em standby/cold-start, ele acordará na primeira query sem dar crash de startup.
    this._baseClient
      .$connect()
      .then(() => this.logger.log('✔ Prisma connected successfully'))
      .catch((err: any) =>
        this.logger.error(
          `⚠ Prisma initial connect check (will retry on query): ${err.message}`,
        ),
      );
  }

  async onModuleDestroy(): Promise<void> {
    await this._baseClient.$disconnect();
  }
}
