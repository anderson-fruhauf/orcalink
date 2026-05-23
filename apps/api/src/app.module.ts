import { Module, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FirebaseModule } from './firebase/firebase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { SupplierModule } from './modules/supplier/supplier.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { QuotationModule } from './modules/quotation/quotation.module.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    AuthModule,
    ProductModule,
    SupplierModule,
    CategoryModule,
    DashboardModule,
    QuotationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
