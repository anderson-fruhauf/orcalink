import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateQuotationItemDto {
  @IsUUID('4', { message: 'O ID do produto deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do produto é obrigatório.' })
  productId: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima é 1.' })
  @IsNotEmpty({ message: 'A quantidade é obrigatória.' })
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'As observações devem ter no máximo 1000 caracteres.',
  })
  notes?: string;
}
