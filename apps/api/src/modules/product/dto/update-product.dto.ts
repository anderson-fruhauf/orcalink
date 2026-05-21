import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ProductUnit } from './create-product.dto.js';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductUnit, {
    message:
      'A unidade de medida deve ser uma das seguintes: UN, KG, LITRO, CX, M, M2, M3.',
  })
  @IsOptional()
  unit?: ProductUnit;

  @IsString()
  @IsOptional()
  internalCode?: string;

  @IsUUID('4', { message: 'A categoria informada deve ser um UUID válido.' })
  @IsOptional()
  categoryId?: string;
}
