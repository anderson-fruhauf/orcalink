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
import {
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
} from '../constants/error-messages.js';

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

    let message: string | string[] = INTERNAL_ERROR_MESSAGE;
    let errorName = 'ErroInterno';

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message =
          (exceptionResponse as any).message ||
          INTERNAL_ERROR_MESSAGE;
        errorName = mapErrorLabel(statusCode, (exceptionResponse as any).error);
      } else {
        message =
          statusCode >= 500 ? INTERNAL_ERROR_MESSAGE : String(exceptionResponse);
        errorName = mapErrorLabel(statusCode);
      }
    } else if (exception instanceof Error) {
      message = statusCode >= 500 ? INTERNAL_ERROR_MESSAGE : exception.message;
      errorName = mapErrorLabel(statusCode, exception.name);
    }

    if (statusCode >= 500) {
      message = INTERNAL_ERROR_MESSAGE;
    }

    const msgString = Array.isArray(message) ? message.join(', ') : message;

    if (
      statusCode === 404 &&
      typeof msgString === 'string' &&
      /^Cannot (GET|POST|PUT|PATCH|DELETE)/.test(msgString)
    ) {
      message = NOT_FOUND_MESSAGE;
    }

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

function mapErrorLabel(statusCode: number, rawError?: string): string {
  switch (statusCode) {
    case 400:
      return 'RequisicaoInvalida';
    case 401:
      return 'NaoAutorizado';
    case 403:
      return 'AcessoNegado';
    case 404:
      return 'NaoEncontrado';
    case 409:
      return 'Conflito';
    case 503:
      return 'Indisponivel';
    default:
      if (statusCode >= 500) {
        return 'ErroInterno';
      }
      return rawError || 'Erro';
  }
}
