import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum ProductUnit {
  UN = 'UN',
  KG = 'KG',
  LITRO = 'LITRO',
  CX = 'CX',
  M = 'M',
  M2 = 'M2',
  M3 = 'M3',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do produto é obrigatório.' })
  @MaxLength(255, {
    message: 'O nome do produto deve ter no máximo 255 caracteres.',
  })
  name: string;

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
  @IsNotEmpty({ message: 'A unidade de medida é obrigatória.' })
  unit: ProductUnit;

  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'O código interno deve ter no máximo 100 caracteres.',
  })
  internalCode?: string;

  @IsUUID('4', { message: 'A categoria informada deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'A categoria do produto é obrigatória.' })
  categoryId: string;
}
