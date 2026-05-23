import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
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
  search?: string;

  @IsOptional()
  @IsEnum(QuotationStatus, {
    message: 'O status deve ser DRAFT, OPEN ou CLOSED.',
  })
  status?: QuotationStatus;
}
