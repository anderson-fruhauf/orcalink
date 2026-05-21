import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  // Cache em memória compartilhado entre instâncias (estático)
  private static readonly userCache = new Map<
    string,
    { user: any; expiresAt: number }
  >();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  static getCachedUser(firebaseUid: string): any | null {
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
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const decodedToken = await this.firebaseAdmin.verifyIdToken(token);

      // Tenta obter do cache primeiro
      let user = FirebaseAuthGuard.getCachedUser(decodedToken.uid);

      if (!user) {
        user = await this.prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
          include: { tenant: true },
        });

        if (user) {
          FirebaseAuthGuard.setCachedUser(decodedToken.uid, user);
        }
      }

      if (!user) {
        throw new UnauthorizedException(
          'User not registered in local database',
        );
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
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid Firebase token',
      );
    }
  }
}
