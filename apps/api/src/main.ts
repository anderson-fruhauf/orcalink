import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { JsonLogger } from './common/logger/json-logger.js';
import { validateEnv } from './config/env.js';

validateEnv();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: new JsonLogger(),
    });
    app.setGlobalPrefix('api');

    app.use(helmet());

    const allowedOrigins = process.env.APP_URL
      ? process.env.APP_URL.split(',').map((url) => url.trim())
      : true;

    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    });

    const port = process.env.PORT ?? 3333;
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://0.0.0.0:${port}/api`);
  } catch (error) {
    console.error('Fatal error during application bootstrap:', error);
    process.exit(1);
  }
}
void bootstrap();
