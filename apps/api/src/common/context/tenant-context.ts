import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<{
    tenantId: string;
  }>();

  static run<T>(tenantId: string, callback: () => T): T {
    return this.storage.run({ tenantId }, callback);
  }

  static getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }
}
