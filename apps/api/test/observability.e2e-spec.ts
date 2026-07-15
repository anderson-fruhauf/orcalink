import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Observability (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 and status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            status: 'ok',
            timestamp: expect.any(String),
          });
        });
    });
  });

  describe('GET /api/ready', () => {
    it('should return 200 if database is healthy', async () => {
      jest.spyOn(prismaService, 'isHealthy').mockResolvedValue(true);

      await request(app.getHttpServer())
        .get('/ready')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            status: 'ok',
            database: 'up',
            timestamp: expect.any(String),
          });
        });
    });

    it('should return 503 if database is unhealthy', async () => {
      jest.spyOn(prismaService, 'isHealthy').mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE)
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: {
              status: 'error',
              database: 'down',
            },
            error: 'ServiceUnavailableException',
            correlationId: expect.any(String),
          });
        });
    });
  });

  describe('Global Exception Filter and Correlation ID', () => {
    it('should return 404 with standardized error and correlation ID', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route-123')
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.headers['x-correlation-id']).toBeDefined();
          expect(res.body).toEqual({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Cannot GET /non-existent-route-123',
            error: 'NotFoundException',
            correlationId: res.headers['x-correlation-id'],
          });
        });
    });

    it('should preserve and propagate x-correlation-id from client request headers', () => {
      const clientCorrelationId = 'client-uuid-123456';
      return request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', clientCorrelationId)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.headers['x-correlation-id']).toBe(clientCorrelationId);
        });
    });
  });
});
