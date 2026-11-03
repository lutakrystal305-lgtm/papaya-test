import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { CalculationBundle } from './interfaces/calculation-output.interface';

describe('CalculationsController', () => {
  const bundle = { output: { results: [] }, report: '# report\n' } as unknown as CalculationBundle;
  const calculate = jest.fn(() => bundle);
  const controller = new CalculationsController({ calculate } as unknown as CalculationsService);
  const body = { policy: { policy_number: 'P' }, expenses: [] };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the calculation output', () => {
    expect(controller.calculate(body)).toBe(bundle.output);
    expect(calculate).toHaveBeenCalledWith(body.policy, body.expenses);
  });

  it('returns the Markdown report', () => {
    expect(controller.report(body)).toBe('# report\n');
  });
});
