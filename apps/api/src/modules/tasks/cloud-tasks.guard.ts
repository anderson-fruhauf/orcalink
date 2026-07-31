import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AUTH_UNAUTHORIZED_MESSAGE } from '../../common/constants/error-messages.js';

@Injectable()
export class CloudTasksGuard implements CanActivate {
  private readonly logger = new Logger(CloudTasksGuard.name);
  private readonly oauthClient = new OAuth2Client();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (this.isEmulatorMode()) {
      return this.validateDevSecret(request);
    }

    return this.validateOidcToken(request);
  }

  private isEmulatorMode(): boolean {
    return (
      process.env['NODE_ENV'] !== 'production' &&
      Boolean(process.env['CLOUD_TASKS_EMULATOR_HOST'])
    );
  }

  private validateDevSecret(request: {
    headers: Record<string, string | undefined>;
  }): boolean {
    const expected = process.env['CLOUD_TASKS_DEV_SECRET'];
    const provided = request.headers['x-tasks-secret'];

    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    return true;
  }

  private async validateOidcToken(request: {
    headers: Record<string, string | undefined>;
  }): Promise<boolean> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const token = authHeader.slice('Bearer '.length);
    const audience = process.env['WORKER_URL'];
    const expectedSa = process.env['CLOUD_TASKS_INVOKER_SA'];

    if (!audience || !expectedSa) {
      this.logger.error(
        'WORKER_URL or CLOUD_TASKS_INVOKER_SA is not configured',
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience,
      });
      const payload = ticket.getPayload();
      const email = payload?.email;

      if (!email || email !== expectedSa) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        'Cloud Tasks OIDC verification failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }
}
