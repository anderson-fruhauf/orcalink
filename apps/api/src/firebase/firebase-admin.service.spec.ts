import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAdminService } from './firebase-admin.service.js';
import admin from 'firebase-admin';
import * as fs from 'fs';

// Mock do firebase-admin
jest.mock('firebase-admin', () => {
  const mockAuthObj = {
    verifyIdToken: jest.fn(),
  };
  const mockAppObj = {};

  return {
    apps: [],
    initializeApp: jest.fn().mockReturnValue(mockAppObj),
    credential: {
      cert: jest.fn().mockReturnValue({}),
    },
    auth: jest.fn().mockReturnValue(mockAuthObj),
  };
});

// Mock do fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('FirebaseAdminService', () => {
  let service: FirebaseAdminService;
  let mockInitializeApp: jest.Mock;
  let mockVerifyIdToken: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockInitializeApp = admin.initializeApp as jest.Mock;
    mockVerifyIdToken = (admin.auth() as any).verifyIdToken as jest.Mock;

    // Reset admin.apps array para simular que não há apps inicializados por padrão
    (admin.apps as any) = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseAdminService],
    }).compile();

    service = module.get<FirebaseAdminService>(FirebaseAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should initialize firebase-admin using certificate if service account path exists', () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = './credentials.json';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '{"project_id": "test-project"}',
      );

      service.onModuleInit();

      expect(fs.existsSync).toHaveBeenCalledWith('./credentials.json');
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf8');
      expect(mockInitializeApp).toHaveBeenCalledWith({
        credential: expect.any(Object),
      });
    });

    it('should initialize firebase-admin with default settings if path does not exist', () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = './credentials.json';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      service.onModuleInit();

      expect(mockInitializeApp).toHaveBeenCalledWith();
    });

    it('should initialize firebase-admin with default settings if path is not provided', () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      service.onModuleInit();

      expect(mockInitializeApp).toHaveBeenCalledWith();
    });

    it('should reuse already initialized app if admin.apps has items', () => {
      const mockExistingApp = {} as any;
      (admin.apps as any) = [mockExistingApp];

      service.onModuleInit();

      expect(mockInitializeApp).not.toHaveBeenCalled();
    });
  });

  describe('verifyIdToken', () => {
    it('should call verifyIdToken on auth object with correct token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user123',
        email: 'user@test.com',
      });
      service.onModuleInit();

      const result = await service.verifyIdToken('test-token');

      expect(admin.auth).toHaveBeenCalled();
      expect(mockVerifyIdToken).toHaveBeenCalledWith('test-token');
      expect(result).toEqual({ uid: 'user123', email: 'user@test.com' });
    });
  });
});
