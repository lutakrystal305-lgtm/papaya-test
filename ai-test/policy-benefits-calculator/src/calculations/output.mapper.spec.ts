import { BenefitsCalculator } from './calculator/benefits-calculator';
import { expense, sampleExpenses } from '../testing/expense.builder';
import { samplePolicy } from '../testing/policy.builder';
import { toCalculationOutput } from './output.mapper';

const RESULT_KEYS = [
  'expense_id',
  'date',
  'benefit_type',
  'sub_benefit',
  'submitted_amount',
  'covered_amount',
  'copay_amount',
  'deductible_applied',
  'member_pays',
  'decision',
  'reason',
  'remaining_annual_limit',
  'remaining_visit_limit',
];

describe('toCalculationOutput', () => {
  const output = toCalculationOutput(
    BenefitsCalculator.calculate(samplePolicy(), sampleExpenses()),
  );

  it('maps each result to snake_case keys in contract order', () => {
    expect(Object.keys(output)).toEqual(['results', 'summary']);
    expect(Object.keys(output.results[0])).toEqual(RESULT_KEYS);
  });

  it('writes amounts in major units', () => {
    expect(output.results[0]).toMatchObject({
      expense_id: 'EXP-001',
      date: '2024-01-10',
      submitted_amount: 2500,
      covered_amount: 1200,
      copay_amount: 300,
      deductible_applied: 1000,
      member_pays: 1300,
      decision: 'PARTIALLY_COVERED',
      remaining_annual_limit: 18800,
      remaining_visit_limit: 4,
    });
  });

  it('keeps nulls for balances that do not apply', () => {
    expect(output.results[1].remaining_visit_limit).toBeNull();
  });

  it('maps the summary in contract order', () => {
    const { summary } = output;
    expect(Object.keys(summary)).toEqual([
      'policy_number',
      'currency',
      'expense_count',
      'totals',
      'decisions',
      'benefits',
    ]);
    expect(summary.totals).toEqual({
      submitted: 124000,
      covered: 90600,
      copay: 4600,
      deductible: 1000,
      member_pays: 33400,
    });
    expect(summary.decisions).toEqual({ COVERED: 3, PARTIALLY_COVERED: 11, DENIED: 6 });
    expect(summary.benefits[1]).toMatchObject({
      type: 'OUTPATIENT',
      limit_kind: 'ANNUAL',
      limit: 20000,
      used: 20000,
      remaining: 0,
      deductible: { amount: 1000, used: 1000, remaining: 0 },
    });
    expect(summary.benefits[1].sub_benefits[2]).toEqual({
      name: 'Diagnostic Tests',
      used: 6000,
      year_limit: { limit: 6000, remaining: 0 },
      visits: null,
      days: null,
    });
    expect(summary.benefits[0].sub_benefits[0].days).toEqual({ limit: 10, used: 5, remaining: 5 });
  });

  it('rounds amounts to at most 2 decimals', () => {
    const fractional = toCalculationOutput(
      BenefitsCalculator.calculate(samplePolicy(), [
        expense({ type: 'INPATIENT', sub: 'Surgery', amount: 1234.565 }),
      ]),
    );
    expect(fractional.results[0].submitted_amount).toBe(1234.57);
  });
});
