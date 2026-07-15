import { Injectable, LoggerService } from '@nestjs/common';
import { LoggerContext } from './logger-context.js';

@Injectable()
export class JsonLogger implements LoggerService {
  log(message: any, context?: string) {
    this.print('log', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.print('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.print('warn', message, context);
  }

  debug?(message: any, context?: string) {
    this.print('debug', message, context);
  }

  verbose?(message: any, context?: string) {
    this.print('verbose', message, context);
  }

  fatal?(message: any, trace?: string, context?: string) {
    this.print('fatal', message, context, trace);
  }

  private print(level: string, message: any, context?: string, trace?: string) {
    const correlationId = LoggerContext.getCorrelationId();
    const timestamp = new Date().toISOString();

    const logObject: Record<string, any> = {
      timestamp,
      level,
      context,
      correlationId: correlationId || undefined,
    };

    if (message instanceof Error) {
      logObject['message'] = message.message;
      logObject['stack'] = message.stack;
    } else if (typeof message === 'object' && message !== null) {
      Object.assign(logObject, message);
      if (message.message) {
        logObject['message'] = message.message;
      }
    } else {
      logObject['message'] = String(message);
    }

    if (trace) {
      logObject['stack'] = trace;
    }

    process.stdout.write(JSON.stringify(logObject) + '\n');
  }
}
