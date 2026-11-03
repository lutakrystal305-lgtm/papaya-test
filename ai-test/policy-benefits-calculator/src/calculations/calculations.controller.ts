import { Body, Controller, Header, HttpCode, HttpStatus, Post, UseFilters } from '@nestjs/common';

import { CalculationExceptionFilter } from './calculation-exception.filter';
import { CalculationsService } from './calculations.service';
import { CalculateBenefitsRequestDto } from './dto/calculate-benefits-request.dto';
import { CalculationOutput } from './interfaces/calculation-output.interface';

const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

@Controller('calculations')
@UseFilters(CalculationExceptionFilter)
export class CalculationsController {
  constructor(private readonly calculationsService: CalculationsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  calculate(@Body() body: CalculateBenefitsRequestDto): CalculationOutput {
    return this.calculationsService.calculate(body.policy, body.expenses).output;
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  @Header('content-type', MARKDOWN_CONTENT_TYPE)
  report(@Body() body: CalculateBenefitsRequestDto): string {
    return this.calculationsService.calculate(body.policy, body.expenses).report;
  }
}
