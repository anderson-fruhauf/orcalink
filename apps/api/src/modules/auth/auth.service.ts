import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async register(dto: RegisterDto, authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    let decodedToken;
    try {
      decodedToken = await this.firebaseAdmin.verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid Firebase token',
      );
    }

    const { uid: firebaseUid, email } = decodedToken;

    if (!email) {
      throw new UnauthorizedException('Firebase token must contain email');
    }

    // Verificar se o usuário já existe no banco local por firebaseUid ou email
    const existingUser = await this.prisma.cleanUser.findFirst({
      where: {
        OR: [{ firebaseUid }, { email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User or Firebase UID already registered');
    }

    // Criar Tenant e User em uma transação do Prisma
    return this.prisma.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          plan: 'FREE',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          firebaseUid,
          name: dto.name,
        },
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          firebaseUid: user.firebaseUid,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
        },
      };
    });
  }

  async getMe(userId: string) {
    console.log(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        firebaseUid: user.firebaseUid,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
      },
    };
  }
}
