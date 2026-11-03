import { Injectable } from '@nestjs/common';

import { BenefitsCalculator } from './calculator/benefits-calculator';
import { InputParserService } from './input-parser.service';
import { CalculationBundle } from './interfaces/calculation-output.interface';
import { toCalculationOutput } from './output.mapper';
import { ReportRendererService } from './report-renderer.service';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly parser: InputParserService,
    private readonly renderer: ReportRendererService,
  ) {}

  // Throws PolicyValidationError / InputFormatError before any expense is processed.
  calculate(policyInput: unknown, expensesInput: unknown): CalculationBundle {
    const policy = this.parser.parsePolicy(policyInput);
    const expenses = this.parser.parseExpenses(expensesInput);
    const output = toCalculationOutput(BenefitsCalculator.calculate(policy, expenses));
    return { output, report: this.renderer.render(output) };
  }
}
