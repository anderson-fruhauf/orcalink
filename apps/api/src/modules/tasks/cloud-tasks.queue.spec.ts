import { CloudTasksQueue } from './cloud-tasks.queue.js';

describe('CloudTasksQueue', () => {
  const originalEnv = process.env;

  const mockClient = {
    queuePath: jest.fn(
      (project: string, location: string, queue: string) =>
        `projects/${project}/locations/${location}/queues/${queue}`,
    ),
    createTask: jest.fn(),
    getQueue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.queuePath.mockImplementation(
      (project: string, location: string, queue: string) =>
        `projects/${project}/locations/${location}/queues/${queue}`,
    );
    process.env = {
      ...originalEnv,
      GCP_PROJECT_ID: 'orcalink-dev',
      GCP_LOCATION: 'us-central1',
      WORKER_URL: 'https://worker.example.com',
      CLOUD_TASKS_INVOKER_SA: 'invoker@orcalink.iam.gserviceaccount.com',
    };
    delete process.env['CLOUD_TASKS_EMULATOR_HOST'];
    delete process.env['CLOUD_TASKS_DEV_SECRET'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve montar createTask com URL, OIDC, payload base64 e dedupeKey', async () => {
    mockClient.createTask.mockResolvedValue([{}]);
    const queue = new CloudTasksQueue(mockClient as any);

    await queue.enqueue(
      'email-dispatch',
      { tenantId: 't-1', quotationSupplierId: 'qs-1' },
      { dedupeKey: 'email:qs-1:123', delaySeconds: 10 },
    );

    expect(mockClient.createTask).toHaveBeenCalledWith({
      parent:
        'projects/orcalink-dev/locations/us-central1/queues/email-dispatch',
      task: expect.objectContaining({
        name: 'projects/orcalink-dev/locations/us-central1/queues/email-dispatch/tasks/email-qs-1-123',
        scheduleTime: expect.objectContaining({
          seconds: expect.any(Number),
        }),
        httpRequest: expect.objectContaining({
          httpMethod: 'POST',
          url: 'https://worker.example.com/api/tasks/email-dispatch',
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(
            JSON.stringify({
              tenantId: 't-1',
              quotationSupplierId: 'qs-1',
            }),
          ).toString('base64'),
          oidcToken: {
            serviceAccountEmail: 'invoker@orcalink.iam.gserviceaccount.com',
            audience: 'https://worker.example.com',
          },
        }),
      }),
    });
  });

  it('deve usar X-Tasks-Secret e omitir OIDC no modo emulador', async () => {
    process.env['CLOUD_TASKS_EMULATOR_HOST'] = 'localhost:8123';
    process.env['CLOUD_TASKS_DEV_SECRET'] = 'dev-tasks-secret';
    mockClient.createTask.mockResolvedValue([{}]);

    const queue = new CloudTasksQueue(mockClient as any);
    await queue.enqueue('whatsapp-dispatch', {
      tenantId: 't-1',
      quotationId: 'q-1',
      quotationSupplierIds: ['qs-1'],
    });

    const call = mockClient.createTask.mock.calls[0][0];
    expect(call.task.httpRequest.url).toBe(
      'https://worker.example.com/api/tasks/whatsapp-dispatch',
    );
    expect(call.task.httpRequest.headers['X-Tasks-Secret']).toBe(
      'dev-tasks-secret',
    );
    expect(call.task.httpRequest.oidcToken).toBeUndefined();
  });

  it('deve reescrever localhost para host.docker.internal no modo emulador', async () => {
    process.env['WORKER_URL'] = 'http://localhost:3333';
    process.env['CLOUD_TASKS_EMULATOR_HOST'] = 'localhost:8123';
    process.env['CLOUD_TASKS_DEV_SECRET'] = 'dev-tasks-secret';
    mockClient.createTask.mockResolvedValue([{}]);

    const queue = new CloudTasksQueue(mockClient as any);
    await queue.enqueue('email-dispatch', {
      tenantId: 't-1',
      quotationSupplierId: 'qs-1',
    });

    const call = mockClient.createTask.mock.calls[0][0];
    expect(call.task.httpRequest.url).toBe(
      'http://host.docker.internal:3333/api/tasks/email-dispatch',
    );
  });

  it('deve ignorar ALREADY_EXISTS no dedupe', async () => {
    mockClient.createTask.mockRejectedValue({ code: 6 });
    const queue = new CloudTasksQueue(mockClient as any);

    await expect(
      queue.enqueue(
        'email-dispatch',
        { tenantId: 't-1', quotationSupplierId: 'qs-1' },
        { dedupeKey: 'email:qs-1:1' },
      ),
    ).resolves.toBeUndefined();
  });

  it('deve reportar saúde via getQueue', async () => {
    mockClient.getQueue.mockResolvedValue([{}]);
    const queue = new CloudTasksQueue(mockClient as any);

    await expect(queue.isHealthy()).resolves.toBe(true);
    expect(mockClient.getQueue).toHaveBeenCalledWith({
      name: 'projects/orcalink-dev/locations/us-central1/queues/email-dispatch',
    });
  });
});
