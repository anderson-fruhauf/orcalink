import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty({ message: 'O título da cotação é obrigatório.' })
  @MaxLength(255, {
    message: 'O título da cotação deve ter no máximo 255 caracteres.',
  })
  title: string;

  @IsDateString({}, { message: 'O prazo de entrega deve ser uma data válida.' })
  @IsNotEmpty({ message: 'O prazo de entrega é obrigatório.' })
  deadline: string;
}
