import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAdminService } from './firebase-admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockFirebaseAdminService = {
    verifyIdToken: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseAuthGuard,
        { provide: FirebaseAdminService, useValue: mockFirebaseAdminService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    guard = module.get<FirebaseAuthGuard>(FirebaseAuthGuard);
    firebaseAdminService = module.get(FirebaseAdminService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if no authorization header is present', async () => {
    const context = createMockExecutionContext(null);
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing authorization header'),
    );
  });

  it('should throw UnauthorizedException if header is not Bearer', async () => {
    const context = createMockExecutionContext('Basic some-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid authorization header format'),
    );
  });

  it('should throw UnauthorizedException if Firebase verification fails', async () => {
    const context = createMockExecutionContext('Bearer invalid-token');
    firebaseAdminService.verifyIdToken.mockRejectedValue(new Error('Firebase error'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Firebase error'),
    );
  });

  it('should throw UnauthorizedException if user is not in local database', async () => {
    const context = createMockExecutionContext('Bearer valid-token');
    firebaseAdminService.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'test@orcalink.com' } as any);
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('User not registered in local database'),
    );
  });

  it('should inject request.user and return true for valid token and local user', async () => {
    const context = createMockExecutionContext('Bearer valid-token');
    const mockUser = {
      id: 'local-user-id',
      tenantId: 'tenant-id',
      email: 'test@orcalink.com',
      firebaseUid: 'firebase-uid',
    };
    firebaseAdminService.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'test@orcalink.com' } as any);
    prismaService.user.findUnique.mockResolvedValue(mockUser as any);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({
      userId: 'local-user-id',
      tenantId: 'tenant-id',
      email: 'test@orcalink.com',
      firebaseUid: 'firebase-uid',
    });
  });

  function createMockExecutionContext(authHeader: string | null): ExecutionContext {
    const request = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: null,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }
});
