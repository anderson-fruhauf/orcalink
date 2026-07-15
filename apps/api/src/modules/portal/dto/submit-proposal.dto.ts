import {
  IsInt,
  Min,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalItemDto } from './proposal-item.dto.js';

export class SubmitProposalDto {
  @IsInt({ message: 'O prazo de entrega deve ser um número inteiro.' })
  @Min(1, { message: 'O prazo de entrega deve ser de no mínimo 1 dia.' })
  @IsNotEmpty({ message: 'O prazo de entrega é obrigatório.' })
  deliveryDays: number;

  @IsString({ message: 'A condição de pagamento deve ser um texto.' })
  @IsNotEmpty({ message: 'A condição de pagamento é obrigatória.' })
  @MaxLength(200, {
    message: 'A condição de pagamento deve ter no máximo 200 caracteres.',
  })
  paymentCondition: string;

  @IsString({ message: 'As observações devem ser um texto.' })
  @IsOptional()
  @MaxLength(2000, {
    message: 'As observações devem ter no máximo 2000 caracteres.',
  })
  notes?: string;

  @IsArray({ message: 'Os itens devem ser uma lista.' })
  @ArrayNotEmpty({ message: 'A proposta deve conter pelo menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items: ProposalItemDto[];
}
