import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export type DispatchKind = 'invite' | 'reminder';

export class EmailDispatchDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  quotationSupplierId!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsIn(['invite', 'reminder'])
  kind?: DispatchKind;
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

  @IsOptional()
  @IsIn(['invite', 'reminder'])
  kind?: DispatchKind;
}

export class RemindQuotationDto {
  @IsUUID()
  quotationId!: string;

  @IsUUID()
  tenantId!: string;
}
