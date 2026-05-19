import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

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
      
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: { tenant: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not registered in local database');
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
      throw new UnauthorizedException(error instanceof Error ? error.message : 'Invalid Firebase token');
    }
  }
}
