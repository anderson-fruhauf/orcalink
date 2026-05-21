import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FirebaseModule } from '../../firebase/firebase.module.js';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
