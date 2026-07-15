import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'O nome da categoria deve ter no máximo 100 caracteres.',
  })
  name?: string;
}
