import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service.js';
import { QuotationController } from './quotation.controller.js';

@Module({
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
