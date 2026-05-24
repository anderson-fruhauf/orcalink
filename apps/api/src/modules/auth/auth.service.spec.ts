import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;
  let prismaService: any;

  const mockFirebaseAdminService = {
    verifyIdToken: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cleanUser: {
      findFirst: jest.fn(),
    },
    tenant: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseAdminService, useValue: mockFirebaseAdminService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    firebaseAdminService = module.get(FirebaseAdminService);
    prismaService = module.get(PrismaService);

    // Mock transaction to immediately execute the callback with mockPrismaService
    prismaService.$transaction.mockImplementation((cb: any) =>
      cb(prismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = { name: 'Anderson', companyName: 'Orca' };
    const authHeader = 'Bearer valid-token';

    it('should throw UnauthorizedException if authHeader is missing', async () => {
      await expect(service.register(dto, '')).rejects.toThrow(
        new UnauthorizedException('Missing authorization header'),
      );
    });

    it('should throw UnauthorizedException if authHeader format is invalid', async () => {
      await expect(service.register(dto, 'Basic token')).rejects.toThrow(
        new UnauthorizedException('Invalid authorization header format'),
      );
    });

    it('should throw UnauthorizedException if Firebase verification fails', async () => {
      firebaseAdminService.verifyIdToken.mockRejectedValue(
        new Error('Auth error'),
      );

      await expect(service.register(dto, authHeader)).rejects.toThrow(
        new UnauthorizedException('Auth error'),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      firebaseAdminService.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid',
        email: 'test@orcalink.com',
      } as any);
      prismaService.cleanUser.findFirst.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.register(dto, authHeader)).rejects.toThrow(
        new ConflictException('User or Firebase UID already registered'),
      );
    });

    it('should create a Tenant (FREE) and User in transaction', async () => {
      firebaseAdminService.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid',
        email: 'test@orcalink.com',
      } as any);
      prismaService.cleanUser.findFirst.mockResolvedValue(null);

      const createdTenant = {
        id: 'tenant-uuid-123',
        name: 'Orca',
        plan: 'FREE',
      };
      const createdUser = {
        id: 'user-uuid-123',
        tenantId: 'tenant-uuid-123',
        email: 'test@orcalink.com',
        firebaseUid: 'firebase-uid',
        name: 'Anderson',
      };

      prismaService.tenant.create.mockResolvedValue(createdTenant);
      prismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(dto, authHeader);

      expect(prismaService.tenant.create).toHaveBeenCalledWith({
        data: { name: 'Orca', plan: 'FREE' },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-uuid-123',
          email: 'test@orcalink.com',
          firebaseUid: 'firebase-uid',
          name: 'Anderson',
        },
      });
      expect(result).toEqual({
        user: {
          id: 'user-uuid-123',
          name: 'Anderson',
          email: 'test@orcalink.com',
          firebaseUid: 'firebase-uid',
        },
        tenant: {
          id: 'tenant-uuid-123',
          name: 'Orca',
          plan: 'FREE',
        },
      });
    });
  });

  describe('getMe', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should return user and tenant details if found', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        name: 'Anderson',
        email: 'test@orcalink.com',
        firebaseUid: 'firebase-uid',
        tenant: {
          id: 'tenant-uuid-123',
          name: 'Orca',
          plan: 'FREE',
        },
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-uuid-123');

      expect(result).toEqual({
        user: {
          id: 'user-uuid-123',
          name: 'Anderson',
          email: 'test@orcalink.com',
          firebaseUid: 'firebase-uid',
        },
        tenant: {
          id: 'tenant-uuid-123',
          name: 'Orca',
          plan: 'FREE',
        },
      });
    });
  });
});
