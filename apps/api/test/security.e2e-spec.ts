import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import helmet from 'helmet';
import request from 'supertest';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(helmet());
    app.enableCors();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Helmet security headers', () => {
    it('should include X-Content-Type-Options header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect('X-Content-Type-Options', 'nosniff');
    });

    it('should include X-Frame-Options header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect('X-Frame-Options', 'SAMEORIGIN');
    });

    it('should include X-XSS-Protection header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect('X-XSS-Protection', '0');
    });

    it('should include X-DNS-Prefetch-Control header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect('X-DNS-Prefetch-Control', 'off');
    });

    it('should include Strict-Transport-Security header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect('Strict-Transport-Security', /max-age=\d+/);
    });

    it('should not expose X-Powered-By header', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect((res) => {
          expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });
  });

  describe('CORS', () => {
    it('should respond successfully to GET requests', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200);
    });
  });

  describe('ValidationPipe', () => {
    it('should reject unknown properties with forbidNonWhitelisted', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test',
          companyName: 'Test Corp',
          unexpectedField: 'should be rejected',
        })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(res.body.message).toBeDefined();
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message[0]).toContain('unexpectedField');
        });
    });
  });
});
