import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TenantContext } from '../common/context/tenant-context';

export const multiTenancyAllOperations = async ({
  model,
  operation,
  args,
  query,
}: any) => {
  const tenantId = TenantContext.getTenantId();

  const modelsWithTenant = [
    'User',
    'Category',
    'Product',
    'Supplier',
    'Quotation',
  ];

  if (tenantId && modelsWithTenant.includes(model)) {
    if (
      ['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(
        operation,
      )
    ) {
      args.where = args.where || {};
      args.where.tenantId = tenantId;
    } else if (operation === 'findUnique') {
      // findUnique só aceita campos de constraints únicas no where;
      // services devem usar findFirst com where: { id, tenantId }
    } else if (operation === 'create') {
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
    } else if (['update', 'delete'].includes(operation)) {
      const lookupArgs = {
        where: {
          ...args.where,
          tenantId,
        },
      };
      try {
        const record = await query({
          operation: 'findFirst',
          args: lookupArgs,
        });
        if (!record) {
          throw new ForbiddenException(
            `Acesso negado ou registro não encontrado em ${model}`,
          );
        }
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
      }
    } else if (['updateMany', 'deleteMany'].includes(operation)) {
      args.where = args.where || {};
      args.where.tenantId = tenantId;
    }
  }

  return query(args);
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
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _extendedClient: any;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL']!,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    // Cria um cliente base separado e aplica a extensão nele.
    // Não usamos this.$extends() porque o PrismaClient com adapter
    // pode não ter $extends funcionando corretamente no constructor.
    const baseClient = new PrismaClient({ adapter });
    this._extendedClient = baseClient.$extends(multiTenancyExtension);
  }

  // Getters para expor os modelos usando o cliente estendido
  get user(): Prisma.UserDelegate {
    return this._extendedClient.user;
  }
  get category(): Prisma.CategoryDelegate {
    return this._extendedClient.category;
  }
  get product(): Prisma.ProductDelegate {
    return this._extendedClient.product;
  }
  get supplier(): Prisma.SupplierDelegate {
    return this._extendedClient.supplier;
  }
  get quotation(): Prisma.QuotationDelegate {
    return this._extendedClient.quotation;
  }
  get tenant(): Prisma.TenantDelegate {
    return this._extendedClient.tenant;
  }
  get supplierCategory(): Prisma.SupplierCategoryDelegate {
    return this._extendedClient.supplierCategory;
  }
  get quotationItem(): Prisma.QuotationItemDelegate {
    return this._extendedClient.quotationItem;
  }
  get quotationSupplier(): Prisma.QuotationSupplierDelegate {
    return this._extendedClient.quotationSupplier;
  }
  get magicLink(): Prisma.MagicLinkDelegate {
    return this._extendedClient.magicLink;
  }
  get proposal(): Prisma.ProposalDelegate {
    return this._extendedClient.proposal;
  }
  get proposalItem(): Prisma.ProposalItemDelegate {
    return this._extendedClient.proposalItem;
  }

  private _isInsideTransactionCall = false;

  override async $transaction(args: any, options?: any): Promise<any> {
    if (this._isInsideTransactionCall) {
      return super.$transaction(args, options);
    }

    this._isInsideTransactionCall = true;
    try {
      return await this._extendedClient.$transaction(args, options);
    } finally {
      this._isInsideTransactionCall = false;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
