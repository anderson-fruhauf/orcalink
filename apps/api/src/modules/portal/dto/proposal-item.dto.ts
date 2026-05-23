import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class ProposalItemDto {
  @IsUUID('4', { message: 'O ID do item da cotação deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do item da cotação é obrigatório.' })
  quotationItemId: string;

  @IsInt({ message: 'O preço deve ser um número inteiro.' })
  @Min(1, { message: 'O preço mínimo deve ser maior que zero.' })
  @IsOptional()
  priceInCents?: number | null;

  @IsBoolean({ message: 'O campo de indisponibilidade deve ser um booleano.' })
  @IsOptional()
  unavailable?: boolean;
}
