import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FirebaseAuthGuard } from '../src/firebase/firebase-auth.guard.js';
import { TenantContext } from '../src/common/context/tenant-context.js';

describe('Multi-tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const tenantA = { id: '', token: 'e2e-token-tenant-a' };
  const tenantB = { id: '', token: 'e2e-token-tenant-b' };
  let quotationBId = '';
  let supplierBId = '';

  async function cleanupE2EData() {
    if (quotationBId) {
      await prisma.quotationItem.deleteMany({
        where: { quotationId: quotationBId },
      });
      await prisma.quotationSupplier.deleteMany({
        where: { quotationId: quotationBId },
      });
      await prisma.quotation.deleteMany({ where: { id: quotationBId } });
      quotationBId = '';
    }

    if (tenantB.id) {
      await prisma.product.deleteMany({ where: { tenantId: tenantB.id } });
      await prisma.supplier.deleteMany({ where: { tenantId: tenantB.id } });
      await prisma.category.deleteMany({ where: { tenantId: tenantB.id } });
    }

    await prisma.user.deleteMany({
      where: { id: { in: ['e2e-user-a', 'e2e-user-b'] } },
    });

    if (tenantA.id || tenantB.id) {
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantA.id, tenantB.id].filter(Boolean) } },
      });
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization as string | undefined;

          if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing authorization header');
          }

          const token = authHeader.slice('Bearer '.length);
          const users: Record<
            string,
            { userId: string; tenantId: string; email: string; firebaseUid: string }
          > = {
            [tenantA.token]: {
              userId: 'e2e-user-a',
              tenantId: tenantA.id,
              email: 'e2e-tenant-a@orcalink.test',
              firebaseUid: 'e2e-firebase-uid-a',
            },
            [tenantB.token]: {
              userId: 'e2e-user-b',
              tenantId: tenantB.id,
              email: 'e2e-tenant-b@orcalink.test',
              firebaseUid: 'e2e-firebase-uid-b',
            },
          };

          const user = users[token];
          if (!user || !user.tenantId) {
            throw new UnauthorizedException('Invalid Firebase token');
          }

          req.user = user;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    await cleanupE2EData();

    const createdTenantA = await prisma.tenant.create({
      data: { name: 'E2E Tenant A', plan: 'PRO' },
    });
    tenantA.id = createdTenantA.id;

    const createdTenantB = await prisma.tenant.create({
      data: { name: 'E2E Tenant B', plan: 'PRO' },
    });
    tenantB.id = createdTenantB.id;

    await TenantContext.run(tenantA.id, async () => {
      await prisma.user.create({
        data: {
          id: 'e2e-user-a',
          email: 'e2e-tenant-a@orcalink.test',
          firebaseUid: 'e2e-firebase-uid-a',
          name: 'E2E User A',
        },
      });
    });

    await TenantContext.run(tenantB.id, async () => {
      await prisma.user.create({
        data: {
          id: 'e2e-user-b',
          email: 'e2e-tenant-b@orcalink.test',
          firebaseUid: 'e2e-firebase-uid-b',
          name: 'E2E User B',
        },
      });

      const category = await prisma.category.create({
        data: { name: 'E2E Category B' },
      });

      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: 'E2E Product B',
          unit: 'un',
        },
      });

      const supplier = await prisma.supplier.create({
        data: {
          name: 'E2E Supplier B',
          email: 'supplier-b@orcalink.test',
        },
      });
      supplierBId = supplier.id;

      const quotation = await prisma.quotation.create({
        data: {
          title: 'E2E Quotation B',
          deadline: new Date('2026-12-31T23:59:59.000Z'),
          status: 'OPEN',
        },
      });
      quotationBId = quotation.id;

      await prisma.quotationItem.create({
        data: {
          quotationId: quotation.id,
          productId: product.id,
          quantity: 1,
        },
      });

      await prisma.quotationSupplier.create({
        data: {
          quotationId: quotation.id,
          supplierId: supplier.id,
          responseStatus: 'PENDING',
        },
      });
    });
  });

  afterAll(async () => {
    await cleanupE2EData();
    await app.close();
  });

  describe('POST /api/quotations/:id/resend/:supplierId', () => {
    it('should return 404 when tenant A tries to resend email for tenant B quotation', () => {
      return request(app.getHttpServer())
        .post(`/api/quotations/${quotationBId}/resend/${supplierBId}`)
        .set('Authorization', `Bearer ${tenantA.token}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Cotação não encontrada');
        });
    });
  });
});
