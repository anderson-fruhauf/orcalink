import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsUUID,
} from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail({}, { message: 'O e-mail informado deve ser um e-mail válido.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray({ message: 'As categorias devem ser informadas como uma lista.' })
  @IsUUID('4', {
    each: true,
    message: 'Cada categoria informada deve ser um UUID válido.',
  })
  @IsOptional()
  categoryIds?: string[];
}
