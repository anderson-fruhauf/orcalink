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
        // Verifica que durante a execução do handler, o tenantId está no contexto
        expect(TenantContext.getTenantId()).toBe('mock-tenant-uuid');
        return of('test');
      },
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toBe('test');
        done();
      },
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
        expect(TenantContext.getTenantId()).toBeUndefined();
        return of('no-tenant');
      },
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toBe('no-tenant');
        done();
      },
    });
  });
});
