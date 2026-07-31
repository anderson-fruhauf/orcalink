import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class EmailDispatchDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  quotationSupplierId!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class WhatsappDispatchDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  quotationId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  quotationSupplierIds!: string[];

  @IsOptional()
  @IsString()
  correlationId?: string;
}
