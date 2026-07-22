import { IsEnum } from 'class-validator';
import { DispatchChannel } from '../../../generated/prisma/client.js';

export class UpdateQuotationSupplierChannelDto {
  @IsEnum(DispatchChannel, {
    message: 'Canal de envio inválido.',
  })
  channel!: DispatchChannel;
}
