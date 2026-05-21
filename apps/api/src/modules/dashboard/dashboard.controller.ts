import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';

@Controller('dashboard')
@UseGuards(FirebaseAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }
}
