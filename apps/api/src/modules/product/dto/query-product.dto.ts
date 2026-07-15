import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
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
  @IsUUID('4', { message: 'O ID da categoria deve ser um UUID válido.' })
  categoryId?: string;
}
