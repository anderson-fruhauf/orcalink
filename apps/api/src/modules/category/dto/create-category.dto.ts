import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  @MaxLength(100, {
    message: 'O nome da categoria deve ter no máximo 100 caracteres.',
  })
  name!: string;
}
