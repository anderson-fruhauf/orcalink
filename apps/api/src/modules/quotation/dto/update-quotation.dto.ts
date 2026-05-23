import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateQuotationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
