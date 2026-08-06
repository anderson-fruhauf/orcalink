import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUTH_UNAUTHORIZED_MESSAGE } from '../common/constants/error-messages.js';

class SimpleLruCache<K, V> {
  private readonly cache = new Map<K, V>();
  constructor(private readonly maxLimit: number) {}

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxLimit) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  // Cache em memória com limite de tamanho (LRU) para evitar crescimento sem fim
  private static readonly userCache = new SimpleLruCache<
    string,
    { user: any; expiresAt: number }
  >(1000);

  // TTL reduzido para no máximo 60 segundos para garantir que usuários desativados
  // percam o acesso rapidamente (conforme critério de aceitação).
  private static readonly CACHE_TTL_MS = 60 * 1000; // 60 segundos

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  static getCachedUser(firebaseUid: string): any {
    const entry = this.userCache.get(firebaseUid);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.userCache.delete(firebaseUid);
      return null;
    }

    return entry.user;
  }

  static setCachedUser(firebaseUid: string, user: any): void {
    this.userCache.set(firebaseUid, {
      user,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  static invalidateCache(firebaseUid: string): void {
    this.userCache.delete(firebaseUid);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    try {
      const decodedToken = await this.firebaseAdmin.verifyIdToken(token);

      // Tenta obter do cache primeiro
      let user = FirebaseAuthGuard.getCachedUser(decodedToken.uid);

      if (!user) {
        user = await this.prisma.cleanUser.findUnique({
          where: { firebaseUid: decodedToken.uid },
          include: { tenant: true },
        });

        if (user) {
          FirebaseAuthGuard.setCachedUser(decodedToken.uid, user);
        }
      }

      if (!user) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      request.user = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firebaseUid: user.firebaseUid,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        'Firebase auth verification failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }
}
