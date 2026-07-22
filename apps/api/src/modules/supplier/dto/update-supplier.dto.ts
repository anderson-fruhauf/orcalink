import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { DispatchChannel } from '../../../generated/prisma/client.js';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: 'O nome do fornecedor deve ter no máximo 255 caracteres.',
  })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'O documento deve ter no máximo 50 caracteres.' })
  document?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: 'O nome do contato deve ter no máximo 255 caracteres.',
  })
  contactName?: string;

  @IsEmail({}, { message: 'O e-mail informado deve ser um e-mail válido.' })
  @IsOptional()
  @MaxLength(255, { message: 'O e-mail deve ter no máximo 255 caracteres.' })
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'O telefone deve ter no máximo 50 caracteres.' })
  phone?: string;

  @IsEnum(DispatchChannel, {
    message: 'O canal preferido deve ser E-mail ou WhatsApp.',
  })
  @IsOptional()
  preferredChannel?: DispatchChannel;

  @IsArray({ message: 'As categorias devem ser informadas como uma lista.' })
  @IsUUID('4', {
    each: true,
    message: 'Cada categoria informada deve ser um UUID válido.',
  })
  @IsOptional()
  categoryIds?: string[];
}
