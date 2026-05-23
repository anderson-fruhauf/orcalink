import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PortalService } from './portal.service.js';
import { SubmitProposalDto } from './dto/submit-proposal.dto.js';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get(':token')
  async getQuotation(@Param('token') token: string) {
    return this.portalService.getQuotationByToken(token);
  }

  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async submitProposal(
    @Param('token') token: string,
    @Body() submitProposalDto: SubmitProposalDto,
  ) {
    return this.portalService.submitProposal(token, submitProposalDto);
  }
}
