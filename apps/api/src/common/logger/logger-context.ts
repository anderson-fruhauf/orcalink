import { AsyncLocalStorage } from 'async_hooks';

export interface LoggerStore {
  correlationId: string;
}

export class LoggerContext {
  private static readonly storage = new AsyncLocalStorage<LoggerStore>();

  static run<T>(store: LoggerStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  static getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }
}
