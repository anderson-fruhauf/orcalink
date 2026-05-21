import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do fornecedor é obrigatório.' })
  name: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail({}, { message: 'O e-mail informado deve ser um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail do fornecedor é obrigatório.' })
  email: string;

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
