import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QuotationService } from './quotation.service.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';
import { QueryQuotationDto } from './dto/query-quotation.dto.js';
import { CreateQuotationItemDto } from './dto/create-quotation-item.dto.js';
import { AssociateSuppliersDto } from './dto/associate-suppliers.dto.js';
import { FirebaseAuthGuard } from '../../firebase/firebase-auth.guard.js';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard.js';
import { CheckPlanLimit } from '../../common/decorators/check-plan-limit.decorator.js';

@Controller('quotations')
@UseGuards(FirebaseAuthGuard, PlanLimitGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @CheckPlanLimit('activeQuotations')
  async create(@Body() createQuotationDto: CreateQuotationDto) {
    return this.quotationService.create(createQuotationDto);
  }

  @Get()
  async findAll(@Query() query: QueryQuotationDto) {
    return this.quotationService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    return this.quotationService.update(id, updateQuotationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.quotationService.remove(id);
  }

  @Post(':id/items')
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createQuotationItemDto: CreateQuotationItemDto,
  ) {
    return this.quotationService.addItem(id, createQuotationItemDto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.quotationService.removeItem(id, itemId);
  }

  @Post(':id/suppliers')
  async associateSuppliers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() associateSuppliersDto: AssociateSuppliersDto,
  ) {
    return this.quotationService.associateSuppliers(id, associateSuppliersDto);
  }

  @Post(':id/publish')
  @CheckPlanLimit('emails')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.publish(id);
  }

  @Post(':id/resend/:supplierId')
  @CheckPlanLimit('emails')
  async resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ) {
    return this.quotationService.resend(id, supplierId);
  }

  @Post(':id/close')
  async close(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.close(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.duplicate(id);
  }
}
