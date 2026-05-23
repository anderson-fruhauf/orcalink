import { IsArray, IsUUID } from 'class-validator';

export class AssociateSuppliersDto {
  @IsArray({ message: 'Os IDs dos fornecedores devem ser fornecidos em um array.' })
  @IsUUID('4', { each: true, message: 'Cada ID de fornecedor deve ser um UUID válido.' })
  supplierIds: string[];
}
