import { UnauthorizedException } from '@nestjs/common';
import { CloudTasksGuard } from './cloud-tasks.guard.js';
import { AUTH_UNAUTHORIZED_MESSAGE } from '../../common/constants/error-messages.js';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('CloudTasksGuard', () => {
  let guard: CloudTasksGuard;
  const originalEnv = process.env;

  const createContext = (headers: Record<string, string | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as any;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['CLOUD_TASKS_EMULATOR_HOST'];
    delete process.env['CLOUD_TASKS_DEV_SECRET'];
    delete process.env['WORKER_URL'];
    delete process.env['CLOUD_TASKS_INVOKER_SA'];
    delete process.env['NODE_ENV'];
    mockVerifyIdToken.mockReset();
    guard = new CloudTasksGuard();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('modo emulador (dev)', () => {
    beforeEach(() => {
      process.env['CLOUD_TASKS_EMULATOR_HOST'] = 'localhost:8123';
      process.env['CLOUD_TASKS_DEV_SECRET'] = 'dev-tasks-secret';
      process.env['NODE_ENV'] = 'development';
    });

    it('deve aceitar X-Tasks-Secret válido', async () => {
      const result = await guard.canActivate(
        createContext({ 'x-tasks-secret': 'dev-tasks-secret' }),
      );
      expect(result).toBe(true);
    });

    it('deve rejeitar quando o segredo está ausente ou inválido', async () => {
      await expect(
        guard.canActivate(createContext({})),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
      );

      await expect(
        guard.canActivate(createContext({ 'x-tasks-secret': 'wrong' })),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
      );
    });

    it('não deve usar o emulador quando NODE_ENV=production', async () => {
      process.env['NODE_ENV'] = 'production';
      process.env['WORKER_URL'] = 'https://worker.example.com';
      process.env['CLOUD_TASKS_INVOKER_SA'] =
        'tasks@orcalink.iam.gserviceaccount.com';

      await expect(
        guard.canActivate(
          createContext({ 'x-tasks-secret': 'dev-tasks-secret' }),
        ),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
      );
    });
  });

  describe('modo OIDC (produção)', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'production';
      process.env['WORKER_URL'] = 'https://worker.example.com';
      process.env['CLOUD_TASKS_INVOKER_SA'] =
        'tasks@orcalink.iam.gserviceaccount.com';
    });

    it('deve aceitar token OIDC válido da SA esperada', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'tasks@orcalink.iam.gserviceaccount.com',
        }),
      });

      const result = await guard.canActivate(
        createContext({ authorization: 'Bearer valid-token' }),
      );

      expect(result).toBe(true);
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-token',
        audience: 'https://worker.example.com',
      });
    });

    it('deve rejeitar token com SA diferente', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'other@example.com' }),
      });

      await expect(
        guard.canActivate(
          createContext({ authorization: 'Bearer valid-token' }),
        ),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
      );
    });

    it('deve rejeitar quando Authorization está ausente', async () => {
      await expect(guard.canActivate(createContext({}))).rejects.toThrow(
        new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE),
      );
    });
  });
});
