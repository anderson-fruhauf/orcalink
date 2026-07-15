import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationStatus } from '../../../generated/prisma/client.js';

export class QueryQuotationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'O termo de busca deve ter no máximo 100 caracteres.',
  })
  search?: string;

  @IsOptional()
  @IsEnum(QuotationStatus, {
    message: 'O status deve ser DRAFT, OPEN ou CLOSED.',
  })
  status?: QuotationStatus;
}
