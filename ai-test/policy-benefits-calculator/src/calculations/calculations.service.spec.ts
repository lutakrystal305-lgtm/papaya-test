import { sampleExpenses } from '../testing/expense.builder';
import { samplePolicy } from '../testing/policy.builder';
import { PolicyValidationError } from './calculations.errors';
import { CalculationsService } from './calculations.service';
import { InputParserService } from './input-parser.service';
import { CalculationOutput } from './interfaces/calculation-output.interface';
import { ReportRendererService } from './report-renderer.service';

describe('CalculationsService', () => {
  let parser: jest.Mocked<Pick<InputParserService, 'parsePolicy' | 'parseExpenses'>>;
  let renderer: jest.Mocked<Pick<ReportRendererService, 'render'>>;
  let service: CalculationsService;

  beforeEach(() => {
    parser = {
      parsePolicy: jest.fn((_input: unknown) => samplePolicy()),
      parseExpenses: jest.fn((_input: unknown) => sampleExpenses()),
    };
    renderer = { render: jest.fn((_output: CalculationOutput) => '# report\n') };
    service = new CalculationsService(
      parser as unknown as InputParserService,
      renderer as unknown as ReportRendererService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the calculation output and the rendered report', () => {
    const bundle = service.calculate({ policy: true }, []);

    expect(bundle.output.results).toHaveLength(20);
    expect(bundle.output.summary.totals.covered).toBe(90600);
    expect(bundle.report).toBe('# report\n');
    expect(renderer.render).toHaveBeenCalledWith(bundle.output);
  });

  it('parses the policy before the expenses', () => {
    const policyInput = { policy: true };
    const expensesInput = [{ expense: true }];

    service.calculate(policyInput, expensesInput);

    expect(parser.parsePolicy).toHaveBeenCalledWith(policyInput);
    expect(parser.parseExpenses).toHaveBeenCalledWith(expensesInput);
    expect(parser.parsePolicy.mock.invocationCallOrder[0]).toBeLessThan(
      parser.parseExpenses.mock.invocationCallOrder[0],
    );
  });

  it('propagates policy validation errors without processing expenses', () => {
    const error = new PolicyValidationError(['benefits: at least one benefit is required']);
    parser.parsePolicy.mockImplementation(() => {
      throw error;
    });

    expect(() => service.calculate({}, [])).toThrow(error);
    expect(parser.parseExpenses).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
