import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProductUnit } from './create-product.dto.js';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: 'O nome do produto deve ter no máximo 255 caracteres.',
  })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'A descrição deve ter no máximo 1000 caracteres.',
  })
  description?: string;

  @IsEnum(ProductUnit, {
    message:
      'A unidade de medida deve ser uma das seguintes: UN, KG, LITRO, CX, M, M2, M3.',
  })
  @IsOptional()
  unit?: ProductUnit;

  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'O código interno deve ter no máximo 100 caracteres.',
  })
  internalCode?: string;

  @IsUUID('4', { message: 'A categoria informada deve ser um UUID válido.' })
  @IsOptional()
  categoryId?: string;
}
