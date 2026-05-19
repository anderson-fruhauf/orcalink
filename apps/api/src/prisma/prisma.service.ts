import { Injectable, OnModuleInit, OnModuleDestroy, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TenantContext } from '../common/context/tenant-context.js';

// Extensão portátil e testável de multi-tenancy
export const getMultiTenancyExtension = (getTenantId: () => string | undefined) => {
  return {
    name: 'multi-tenancy',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const tenantId = getTenantId();
          const modelsWithTenant = ['User', 'Category', 'Product', 'Supplier', 'Quotation'];

          if (tenantId && modelsWithTenant.includes(model)) {
            if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              args.where = args.where || {};
              args.where.tenantId = tenantId;

              if (operation === 'findUnique') {
                // Traduz findUnique para findFirst para aceitar campos não-únicos no where
                return query({
                  ...args,
                  operation: 'findFirst',
                });
              }
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
              // Validação rápida de posse: tenta buscar o registro incluindo o filtro de tenantId
              const lookupArgs = {
                where: {
                  ...args.where,
                  tenantId,
                },
              };
              const record = await query({
                operation: 'findFirst',
                args: lookupArgs,
              });
              if (!record) {
                throw new ForbiddenException(`Acesso negado ou registro não encontrado em ${model}`);
              }
            } else if (['updateMany', 'deleteMany'].includes(operation)) {
              args.where = args.where || {};
              args.where.tenantId = tenantId;
            }
          }

          return query(args);
        },
      },
    },
  };
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _extendedClient: any;

  constructor() {
    const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL']! });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    // Aplica a extensão portátil no cliente
    this._extendedClient = this.$extends(
      getMultiTenancyExtension(() => TenantContext.getTenantId())
    );
  }

  // Getters para expor os modelos usando o cliente estendido
  get user() { return this._extendedClient.user; }
  get category() { return this._extendedClient.category; }
  get product() { return this._extendedClient.product; }
  get supplier() { return this._extendedClient.supplier; }
  get quotation() { return this._extendedClient.quotation; }
  get tenant() { return this._extendedClient.tenant; }
  get supplierCategory() { return this._extendedClient.supplierCategory; }
  get quotationItem() { return this._extendedClient.quotationItem; }
  get quotationSupplier() { return this._extendedClient.quotationSupplier; }
  get magicLink() { return this._extendedClient.magicLink; }
  get proposal() { return this._extendedClient.proposal; }
  get proposalItem() { return this._extendedClient.proposalItem; }

  override async $transaction(args: any): Promise<any> {
    return this._extendedClient.$transaction(args);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
