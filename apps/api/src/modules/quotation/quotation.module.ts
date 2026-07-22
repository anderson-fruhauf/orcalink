import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service.js';
import { QuotationController } from './quotation.controller.js';
import { MailModule } from '../mail/mail.module.js';
import { WhatsappModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [MailModule, WhatsappModule],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
