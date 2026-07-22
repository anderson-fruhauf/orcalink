import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { WhatsappService } from './whatsapp.service.js';

@Controller('whatsapp')
@UseGuards(FirebaseAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Sse('connect')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  connect(
    @CurrentUser() user: { tenantId: string },
    @Req() req: Request,
  ): Observable<MessageEvent> {
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    return this.whatsappService.connect(user.tenantId, abortController.signal);
  }

  @Get('status')
  getStatus(@CurrentUser() user: { tenantId: string }) {
    return this.whatsappService.getStatus(user.tenantId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  disconnect(@CurrentUser() user: { tenantId: string }) {
    return this.whatsappService.disconnect(user.tenantId);
  }
}
