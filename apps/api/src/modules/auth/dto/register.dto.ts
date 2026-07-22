import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres.' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'O nome da empresa deve ter no mínimo 2 caracteres.',
  })
  @MaxLength(255, {
    message: 'O nome da empresa deve ter no máximo 255 caracteres.',
  })
  companyName: string;
}
