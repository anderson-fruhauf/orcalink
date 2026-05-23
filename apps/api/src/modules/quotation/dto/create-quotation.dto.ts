import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty({ message: 'O título da cotação é obrigatório.' })
  title: string;

  @IsDateString({}, { message: 'O prazo de entrega deve ser uma data válida.' })
  @IsNotEmpty({ message: 'O prazo de entrega é obrigatório.' })
  deadline: string;
}
