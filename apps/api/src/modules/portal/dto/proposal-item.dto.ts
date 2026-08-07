import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

/**
 * Teto seguro para Int do Prisma/Postgres (32-bit signed).
 * Equivale a no máximo R$ 21.474.836,47.
 */
export const MAX_PRICE_IN_CENTS = 2_147_483_647;

export class ProposalItemDto {
  @IsUUID('4', { message: 'O ID do item da cotação deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do item da cotação é obrigatório.' })
  quotationItemId: string;

  @ValidateIf((o) => !o.unavailable)
  @IsInt({ message: 'O preço deve ser um número inteiro.' })
  @Min(1, { message: 'O preço mínimo deve ser maior que zero.' })
  @Max(MAX_PRICE_IN_CENTS, {
    message: `O preço máximo permitido é R$ ${(MAX_PRICE_IN_CENTS / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
  })
  @IsOptional()
  priceInCents?: number | null;

  @IsBoolean({ message: 'O campo de indisponibilidade deve ser um booleano.' })
  @IsOptional()
  unavailable?: boolean;
}
