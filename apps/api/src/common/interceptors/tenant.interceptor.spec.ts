import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TenantInterceptor } from './tenant.interceptor.js';
import { TenantContext } from '../context/tenant-context.js';
import { of } from 'rxjs';

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;

  beforeEach(() => {
    interceptor = new TenantInterceptor();
  });

  it('should run inside TenantContext when tenantId is present in user', (done) => {
    const mockRequest = {
      user: {
        tenantId: 'mock-tenant-uuid',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => {
        // O contexto deve estar disponível durante a execução do Observable (subscrição),
        // não apenas durante a criação do handle()
        return of('test');
      },
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        // A verificação do contexto ocorre no callback de subscrição,
        // que é onde o handler real do NestJS executa
        expect(TenantContext.getTenantId()).toBe('mock-tenant-uuid');
        expect(val).toBe('test');
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });

  it('should run normally without TenantContext when user has no tenantId', (done) => {
    const mockRequest = {};

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => {
        return of('no-tenant');
      },
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(TenantContext.getTenantId()).toBeUndefined();
        expect(val).toBe('no-tenant');
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });
});
