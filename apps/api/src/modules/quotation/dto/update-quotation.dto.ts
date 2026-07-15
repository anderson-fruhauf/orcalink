import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateQuotationDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: 'O título da cotação deve ter no máximo 255 caracteres.',
  })
  title?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
