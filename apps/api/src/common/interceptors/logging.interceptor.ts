import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { LoggerContext } from '../logger/logger-context.js';
import { JsonLogger } from '../logger/json-logger.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new JsonLogger();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      req.correlationId ||
      uuidv4();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();

    return new Observable((subscriber) => {
      LoggerContext.run({ correlationId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => {
            const duration = Date.now() - startTime;
            this.logger.error(
              {
                message: `Request failed: ${req.method} ${req.originalUrl}`,
                method: req.method,
                url: req.originalUrl,
                statusCode: err.status || err.statusCode || 500,
                duration: `${duration}ms`,
                error: err.message || String(err),
              },
              err.stack,
              'LoggingInterceptor',
            );
            subscriber.error(err);
          },
          complete: () => {
            const duration = Date.now() - startTime;
            this.logger.log(
              {
                message: `Request success: ${req.method} ${req.originalUrl}`,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
              },
              'LoggingInterceptor',
            );
            subscriber.complete();
          },
        });
      });
    });
  }
}
