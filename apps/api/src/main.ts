import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.enableCors();
    const port = process.env.PORT ?? 3333;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: http://0.0.0.0:${port}/api`);
  } catch (error) {
    console.error('❌ Fatal error during application bootstrap:', error);
    process.exit(1);
  }
}
void bootstrap();
