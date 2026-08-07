export const TASK_QUEUE = Symbol('TASK_QUEUE');

export type TaskQueueName =
  | 'email-dispatch'
  | 'whatsapp-dispatch'
  | 'remind-quotation';

export interface EnqueueOptions {
  /** Atraso antes da primeira tentativa (ex.: agendar lembrete). */
  delaySeconds?: number;
  /** Nome determinístico da task — o Cloud Tasks deduplica por nome. */
  dedupeKey?: string;
}

export interface TaskQueue {
  enqueue<T>(
    queue: TaskQueueName,
    payload: T,
    options?: EnqueueOptions,
  ): Promise<void>;
  /** Verifica se a fila principal está acessível (usado pelo /ready no worker). */
  isHealthy(): Promise<boolean>;
}
