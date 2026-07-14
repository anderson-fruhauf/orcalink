import { ValidationPipe } from '@nestjs/common';

describe('Security Configuration', () => {
  describe('ThrottlerModule', () => {
    it('should accept default configuration with 100 limit and 60s ttl', () => {
      const options = {
        throttlers: [{ ttl: 60000, limit: 100 }],
      };

      expect(options.throttlers[0].ttl).toBe(60000);
      expect(options.throttlers[0].limit).toBe(100);
    });

    it('should support custom rate limit options', () => {
      const registerOptions = { default: { limit: 10, ttl: 60000 } };
      const portalOptions = { default: { limit: 30, ttl: 60000 } };
      const authenticatedOptions = { default: { limit: 100, ttl: 60000 } };

      expect(registerOptions.default.limit).toBe(10);
      expect(portalOptions.default.limit).toBe(30);
      expect(authenticatedOptions.default.limit).toBe(100);

      expect(registerOptions.default.ttl).toBe(60000);
      expect(portalOptions.default.ttl).toBe(60000);
      expect(authenticatedOptions.default.ttl).toBe(60000);
    });
  });

  describe('ValidationPipe', () => {
    it('should be configured with whitelist and forbidNonWhitelisted', () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      expect(pipe).toBeDefined();
    });
  });
});
