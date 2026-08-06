import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FirebaseModule } from '../../firebase/firebase.module.js';
import { BaileysWhatsappProvider } from './baileys-whatsapp.provider.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface.js';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    BaileysWhatsappProvider,
    {
      provide: WHATSAPP_PROVIDER,
      useExisting: BaileysWhatsappProvider,
    },
  ],
  exports: [WhatsappService, WHATSAPP_PROVIDER],
})
export class WhatsappModule {}
