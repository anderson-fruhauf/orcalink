import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JsonLogger } from '../logger/json-logger.js';
import { LoggerContext } from '../logger/logger-context.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new JsonLogger();

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const correlationId = request.correlationId || '';

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Erro interno do servidor';
    let errorName = 'InternalServerError';

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message =
          (exceptionResponse as any).message ||
          JSON.stringify(exceptionResponse);
        errorName = (exceptionResponse as any).error || exception.name;
      } else {
        message = String(exceptionResponse);
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    const msgString = Array.isArray(message) ? message.join(', ') : message;

    LoggerContext.run({ correlationId }, () => {
      if (statusCode === 500) {
        this.logger.error(
          {
            message: `Internal Server Error: ${msgString}`,
            path: httpAdapter.getRequestUrl(request),
            method: httpAdapter.getRequestMethod(request),
            statusCode,
          },
          exception instanceof Error ? exception.stack : String(exception),
          'GlobalExceptionFilter',
        );
      } else {
        this.logger.warn(
          `Exception: ${msgString} (Status: ${statusCode}) - Path: ${httpAdapter.getRequestUrl(request)}`,
          'GlobalExceptionFilter',
        );
      }
    });

    const responseBody = {
      statusCode,
      message,
      error: errorName,
      correlationId,
    };

    httpAdapter.reply(response, responseBody, statusCode);
  }
}
