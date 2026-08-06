import { Injectable, Logger, Optional } from '@nestjs/common';
import { CloudTasksClient, protos } from '@google-cloud/tasks';
import { credentials } from '@grpc/grpc-js';
import {
  type EnqueueOptions,
  type TaskQueue,
  type TaskQueueName,
} from './task-queue.interface.js';

const QUEUE_ROUTE: Record<TaskQueueName, string> = {
  'email-dispatch': '/api/tasks/email-dispatch',
  'whatsapp-dispatch': '/api/tasks/whatsapp-dispatch',
};

@Injectable()
export class CloudTasksQueue implements TaskQueue {
  private readonly logger = new Logger(CloudTasksQueue.name);
  private readonly client: CloudTasksClient;
  private readonly projectId: string;
  private readonly location: string;
  private readonly invokerSa: string | undefined;
  private readonly emulatorHost: string | undefined;
  private readonly devSecret: string | undefined;

  constructor(@Optional() client?: CloudTasksClient) {
    this.projectId = process.env['GCP_PROJECT_ID'] || '';
    this.location = process.env['GCP_LOCATION'] || 'us-central1';
    this.invokerSa = process.env['CLOUD_TASKS_INVOKER_SA'];
    this.emulatorHost = process.env['CLOUD_TASKS_EMULATOR_HOST'];
    this.devSecret = process.env['CLOUD_TASKS_DEV_SECRET'];

    this.client = client ?? this.createClient();
  }

  async enqueue<T>(
    queue: TaskQueueName,
    payload: T,
    options?: EnqueueOptions,
  ): Promise<void> {
    const workerUrl = this.resolveWorkerUrl();
    this.assertConfigured(workerUrl);

    const parent = this.client.queuePath(this.projectId, this.location, queue);
    const url = `${workerUrl}${QUEUE_ROUTE[queue]}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.emulatorHost && this.devSecret) {
      headers['X-Tasks-Secret'] = this.devSecret;
    }

    const httpRequest: protos.google.cloud.tasks.v2.IHttpRequest = {
      httpMethod: 'POST',
      url,
      headers,
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    };

    if (!this.emulatorHost) {
      if (!this.invokerSa) {
        throw new Error('CLOUD_TASKS_INVOKER_SA is not configured');
      }
      httpRequest.oidcToken = {
        serviceAccountEmail: this.invokerSa,
        audience: workerUrl,
      };
    }

    const task: protos.google.cloud.tasks.v2.ITask = { httpRequest };

    if (options?.dedupeKey) {
      const taskId = this.sanitizeTaskId(options.dedupeKey);
      task.name = `${parent}/tasks/${taskId}`;
    }

    if (options?.delaySeconds && options.delaySeconds > 0) {
      task.scheduleTime = {
        seconds: Math.floor(Date.now() / 1000) + options.delaySeconds,
      };
    }

    try {
      await this.client.createTask({ parent, task });
    } catch (error) {
      if (this.isAlreadyExists(error)) {
        this.logger.debug(
          `Task already exists (dedupe): ${task.name ?? options?.dedupeKey}`,
        );
        return;
      }
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.projectId) {
      return false;
    }

    try {
      const name = this.client.queuePath(
        this.projectId,
        this.location,
        'email-dispatch',
      );
      await this.client.getQueue({ name });
      return true;
    } catch (error) {
      this.logger.warn(
        `Cloud Tasks health check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Emulador roda no Docker; localhost nele não é a API no host.
   * Reescreve para host.docker.internal quando necessário.
   */
  private resolveWorkerUrl(): string {
    let url = (process.env['WORKER_URL'] || '').replace(/\/$/, '');

    if (
      this.emulatorHost &&
      (url.includes('localhost') || url.includes('127.0.0.1'))
    ) {
      const rewritten = url
        .replaceAll('localhost', 'host.docker.internal')
        .replaceAll('127.0.0.1', 'host.docker.internal');
      this.logger.warn(
        `WORKER_URL ${url} inacessível pelo emulador Docker; usando ${rewritten}`,
      );
      url = rewritten;
    }

    return url;
  }

  private createClient(): CloudTasksClient {
    if (!this.emulatorHost) {
      return new CloudTasksClient();
    }

    const [host, portStr] = this.emulatorHost.split(':');
    const port = Number(portStr);

    return new CloudTasksClient({
      projectId: this.projectId || undefined,
      servicePath: host,
      port: Number.isFinite(port) ? port : 8123,
      sslCreds: credentials.createInsecure(),
    });
  }

  private assertConfigured(workerUrl: string): void {
    if (!this.projectId || !workerUrl) {
      throw new Error(
        'GCP_PROJECT_ID and WORKER_URL must be configured to enqueue tasks',
      );
    }
  }

  private sanitizeTaskId(dedupeKey: string): string {
    return dedupeKey.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 500);
  }

  private isAlreadyExists(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: number | string }).code;
    return code === 6 || code === 'ALREADY_EXISTS';
  }
}
