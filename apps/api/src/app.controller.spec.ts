import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ServiceUnavailableException } from '@nestjs/common';

describe('AppController', () => {
  let appController: AppController;

  const mockPrismaService = {
    isHealthy: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('GET /health', () => {
    it('should return health status ok and a timestamp', () => {
      const res = appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.timestamp).toBeDefined();
    });
  });

  describe('GET /ready', () => {
    it('should return ready status ok if DB is healthy', async () => {
      mockPrismaService.isHealthy.mockResolvedValue(true);

      const res = await appController.getReady();
      expect(res.status).toBe('ok');
      expect(res.database).toBe('up');
      expect(res.timestamp).toBeDefined();
    });

    it('should throw ServiceUnavailableException if DB is unhealthy', async () => {
      mockPrismaService.isHealthy.mockResolvedValue(false);

      await expect(appController.getReady()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
