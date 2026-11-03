import { CalculationsService } from './calculations/calculations.service';
import { InputParserService } from './calculations/input-parser.service';
import { CalculationOutput } from './calculations/interfaces/calculation-output.interface';
import { ReportRendererService } from './calculations/report-renderer.service';

// Pure entry point: no Nest DI, no I/O, no logging (FR-022).
const service = new CalculationsService(new InputParserService(), new ReportRendererService());

export const calculateBenefits = (
  policyInput: unknown,
  expensesInput: unknown,
): CalculationOutput => service.calculate(policyInput, expensesInput).output;

export const renderMarkdownReport = (output: CalculationOutput): string =>
  new ReportRendererService().render(output);

export { InputFormatError, PolicyValidationError } from './calculations/calculations.errors';
export type {
  BenefitSummaryOutput,
  CalculationBundle,
  CalculationOutput,
  ExpenseResultOutput,
  RunSummaryOutput,
  SubBenefitSummaryOutput,
} from './calculations/interfaces/calculation-output.interface';
export type { Decision } from './calculations/calculations.constants';
export { CalculationsModule } from './calculations/calculations.module';
export { CalculationsService } from './calculations/calculations.service';
