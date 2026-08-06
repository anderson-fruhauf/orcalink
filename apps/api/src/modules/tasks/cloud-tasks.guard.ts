import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AUTH_UNAUTHORIZED_MESSAGE } from '../../common/constants/error-messages.js';

const GOOGLE_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
]);

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
    headers: Record<string, string | string[] | undefined>;
  }): boolean {
    const expected = process.env['CLOUD_TASKS_DEV_SECRET'];
    const provided = this.headerValue(request.headers['x-tasks-secret']);

    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    return true;
  }

  private async validateOidcToken(request: {
    headers: Record<string, string | string[] | undefined>;
    protocol?: string;
    hostname?: string;
    url?: string;
  }): Promise<boolean> {
    const token = this.extractBearerToken(request.headers);
    if (!token) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const audience = process.env['WORKER_URL']?.replace(/\/$/, '');
    const expectedSa = process.env['CLOUD_TASKS_INVOKER_SA'];

    if (!audience || !expectedSa) {
      this.logger.error(
        'WORKER_URL or CLOUD_TASKS_INVOKER_SA is not configured',
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const audiences = this.buildAllowedAudiences(audience, request);

    try {
      const payload = await this.verifyOrDecodeClaims(token, audiences);
      this.assertAuthorizedCaller(payload, expectedSa, audiences);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Cloud Tasks OIDC verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }

  private async verifyOrDecodeClaims(
    token: string,
    audiences: string[],
  ): Promise<Record<string, unknown>> {
    // Caminho preferido: verificação criptográfica completa.
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience: audiences,
      });
      return (ticket.getPayload() ?? {}) as Record<string, unknown>;
    } catch (error) {
      // Cloud Run (IAM) pode substituir a assinatura por SIGNATURE_REMOVED_BY_GOOGLE
      // após validar o token na borda. Nesse caso confiamos no IAM + claims.
      if (!this.isSignatureRemovedByGoogle(token)) {
        throw error;
      }

      this.logger.warn(
        'OIDC signature removed by Google Front End; validating claims only (IAM already authenticated the request)',
      );
      return this.decodeJwtPayload(token);
    }
  }

  private assertAuthorizedCaller(
    payload: Record<string, unknown>,
    expectedSa: string,
    audiences: string[],
  ): void {
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const iss = typeof payload.iss === 'string' ? payload.iss : undefined;
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    const aud = payload.aud;

    if (!email || email !== expectedSa) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    if (!iss || !GOOGLE_ISSUERS.has(iss)) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    if (!exp || exp * 1000 < Date.now()) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const tokenAudiences = Array.isArray(aud)
      ? aud.filter((value): value is string => typeof value === 'string')
      : typeof aud === 'string'
        ? [aud]
        : [];

    const audienceOk = tokenAudiences.some((value) =>
      audiences.includes(value.replace(/\/$/, '')),
    );
    if (!audienceOk) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }

  private buildAllowedAudiences(
    workerUrl: string,
    request: { hostname?: string; url?: string },
  ): string[] {
    const audiences = new Set<string>([workerUrl]);

    if (request.hostname) {
      audiences.add(`https://${request.hostname}`);
    }

    // Scheduler/Tasks às vezes usam a URL completa do endpoint como audience
    // quando o campo Audience não foi preenchido no job.
    if (request.hostname && request.url) {
      const path = request.url.split('?')[0];
      audiences.add(`https://${request.hostname}${path}`);
    }

    return [...audiences];
  }

  private extractBearerToken(
    headers: Record<string, string | string[] | undefined>,
  ): string | undefined {
    // Preferir Authorization; alguns clientes usam X-Serverless-Authorization.
    const raw =
      this.headerValue(headers.authorization) ??
      this.headerValue(headers['x-serverless-authorization']) ??
      this.headerValue(headers['x-forwarded-authorization']);

    if (!raw?.startsWith('Bearer ')) {
      return undefined;
    }

    return raw.slice('Bearer '.length).trim();
  }

  private headerValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private isSignatureRemovedByGoogle(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts[2] === 'SIGNATURE_REMOVED_BY_GOOGLE';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Malformed JWT');
    }

    const payload = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');

    return JSON.parse(payload) as Record<string, unknown>;
  }
}
