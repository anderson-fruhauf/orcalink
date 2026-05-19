import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../context/tenant-context.js';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      return TenantContext.run(tenantId, () => next.handle());
    }

    return next.handle();
  }
}
