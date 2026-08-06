import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  AUTH_CONFLICT_MESSAGE,
  AUTH_UNAUTHORIZED_MESSAGE,
} from '../../common/constants/error-messages.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async register(dto: RegisterDto, authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    let decodedToken;
    try {
      decodedToken = await this.firebaseAdmin.verifyIdToken(token);
    } catch (error) {
      this.logger.error(
        'Firebase token verification failed during registration',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const { uid: firebaseUid, email } = decodedToken;

    if (!email) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    // Verificar se o usuário já existe no banco local por firebaseUid ou email
    const existingUser = await this.prisma.cleanUser.findFirst({
      where: {
        OR: [{ firebaseUid }, { email }],
      },
    });

    if (existingUser) {
      throw new ConflictException(AUTH_CONFLICT_MESSAGE);
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
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
