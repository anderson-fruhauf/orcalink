import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PLAN_LIMIT_KEY } from '../decorators/check-plan-limit.decorator.js';

export type PlanResource =
  | 'activeQuotations'
  | 'suppliers'
  | 'products'
  | 'categories'
  | 'emails';

export const PLAN_LIMITS = {
  FREE: {
    activeQuotations: 5,
    suppliers: 10,
    products: 50,
    categories: 20,
    emails: 20,
  },
  PRO: {
    activeQuotations: Infinity,
    suppliers: Infinity,
    products: Infinity,
    categories: Infinity,
    emails: Infinity,
  },
};

function mapResource(resource: string): PlanResource {
  switch (resource) {
    case 'quotations':
    case 'activeQuotations':
    case 'active-quotations':
      return 'activeQuotations';
    case 'suppliers':
      return 'suppliers';
    case 'products':
      return 'products';
    case 'categories':
      return 'categories';
    case 'emails':
      return 'emails';
    default:
      throw new Error(`Unknown plan resource: ${resource}`);
  }
}

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceMetadata = this.reflector.get<string>(
      PLAN_LIMIT_KEY,
      context.getHandler(),
    );

    if (!resourceMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Tenant context not found');
    }

    const tenantId = user.tenantId;

    // Fetch tenant's plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    const plan = tenant.plan;
    const mappedResource = mapResource(resourceMetadata);
    const limit = PLAN_LIMITS[plan]?.[mappedResource] ?? Infinity;

    if (limit === Infinity) {
      return true;
    }

    let current = 0;

    switch (mappedResource) {
      case 'activeQuotations':
        current = await this.prisma.quotation.count({
          where: {
            tenantId,
            status: { not: 'CLOSED' },
          },
        });
        break;
      case 'suppliers':
        current = await this.prisma.supplier.count({
          where: { tenantId },
        });
        break;
      case 'products':
        current = await this.prisma.product.count({
          where: { tenantId },
        });
        break;
      case 'categories':
        current = await this.prisma.category.count({
          where: { tenantId },
        });
        break;
      case 'emails': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        current = await this.prisma.quotationSupplier.count({
          where: {
            quotation: {
              tenantId,
            },
            sentAt: {
              gte: startOfMonth,
            },
          },
        });
        break;
      }
    }

    if (current >= limit) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Limite do plano Free atingido. Faça upgrade para o plano Pro.',
        error: 'Forbidden',
        limit,
        current,
        resource: mappedResource,
        plan,
      });
    }

    return true;
  }
}
