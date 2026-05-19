import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FirebaseModule } from './firebase/firebase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';

@Module({
  imports: [PrismaModule, FirebaseModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
