import { Module } from '@nestjs/common';
import { PortalService } from './portal.service.js';
import { PortalController } from './portal.controller.js';

@Module({
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
