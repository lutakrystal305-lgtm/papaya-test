import { BenefitLedger } from './benefit-ledger';
import { InvalidExpense, ParsedExpense } from '../interfaces/expense.interface';
import { Decision } from '../calculations.constants';
import { Money } from '../utils/money';
import { expense, sampleExpenses } from '../../testing/expense.builder';
import { policyWith, samplePolicy } from '../../testing/policy.builder';
import { BenefitsCalculator } from './benefits-calculator';
import { ExpenseResult } from '../interfaces/expense-result.interface';

const noDeductible = policyWith('OUTPATIENT', { deductible: 0 });

const amounts = (result: ExpenseResult) => ({
  submitted: result.submitted.toMajor(),
  covered: result.covered.toMajor(),
  copay: result.copay.toMajor(),
  deductible: result.deductibleApplied.toMajor(),
  memberPays: result.memberPays.toMajor(),
  decision: result.decision,
});

describe('BenefitsCalculator.adjudicate (single expense)', () => {
  const adjudicate = (
    item: ParsedExpense = expense(),
    policy = noDeductible,
    ledger = BenefitLedger.open(policy),
  ): ExpenseResult => BenefitsCalculator.adjudicate(policy, ledger, item);

  it('US1-AS1: applies a 20% copay', () => {
    const result = adjudicate(expense({ amount: 2500, date: '2024-03-15' }));
    expect(amounts(result)).toEqual({
      submitted: 2500,
      covered: 2000,
      copay: 500,
      deductible: 0,
      memberPays: 500,
      decision: Decision.PARTIALLY_COVERED,
    });
    expect(result.reason).toBe(
      '20% copay applied: 500 THB. Covered: 2,000 THB. Member pays: 500 THB.',
    );
  });

  it('US1-AS2: fully covers an inpatient expense without copay', () => {
    const result = adjudicate(expense({ type: 'INPATIENT', sub: 'Surgery', amount: 40000 }));
    expect(amounts(result)).toEqual({
      submitted: 40000,
      covered: 40000,
      copay: 0,
      deductible: 0,
      memberPays: 0,
      decision: Decision.COVERED,
    });
    expect(result.reason).toBe('Fully covered: 40,000 THB.');
  });

  it('US1-AS3: denies a dental expense inside the waiting period', () => {
    const result = adjudicate(
      expense({ type: 'DENTAL', sub: 'Basic Dental', date: '2024-01-31', amount: 3000 }),
    );
    expect(amounts(result)).toEqual({
      submitted: 3000,
      covered: 0,
      copay: 0,
      deductible: 0,
      memberPays: 3000,
      decision: Decision.DENIED,
    });
    expect(result.reason).toContain(
      'waiting period of 90 days ends 2024-03-31 (60 days remaining)',
    );
  });

  it('US1-AS4: denies an excluded diagnosis and quotes the exclusion', () => {
    const result = adjudicate(expense({ diagnosis: 'Cosmetic skin consultation' }));
    expect(result.decision).toBe(Decision.DENIED);
    expect(result.reason).toContain('"Cosmetic surgery and elective procedures"');
  });

  it('reports the exclusion when both an exclusion and a waiting period apply', () => {
    const result = adjudicate(
      expense({
        type: 'DENTAL',
        sub: 'Basic Dental',
        date: '2024-02-01',
        diagnosis: 'Cosmetic whitening',
      }),
    );
    expect(result.reason).toContain('excluded condition');
  });

  it('US1-AS5: caps at the per-visit limit before copay', () => {
    const result = adjudicate(expense({ amount: 4000 }));
    expect(amounts(result)).toEqual({
      submitted: 4000,
      covered: 2500,
      copay: 500,
      deductible: 0,
      memberPays: 1500,
      decision: Decision.PARTIALLY_COVERED,
    });
    expect(result.reason).toBe(
      'Per-visit limit 3,000 THB applied; 1,000 THB not covered. 20% copay applied, capped at 500 THB per visit: 500 THB. Covered: 2,500 THB. Member pays: 1,500 THB.',
    );
  });

  it('US1-AS6: takes the deductible before copay', () => {
    const result = adjudicate(expense({ amount: 2500 }), samplePolicy());
    expect(amounts(result)).toEqual({
      submitted: 2500,
      covered: 1200,
      copay: 300,
      deductible: 1000,
      memberPays: 1300,
      decision: Decision.PARTIALLY_COVERED,
    });
    expect(result.reason).toContain('Deductible applied: 1,000 THB (0 THB deductible remaining).');
  });

  it('US1-AS7: applies a fixed copay', () => {
    const result = adjudicate(expense({ sub: 'Prescribed Medicine', amount: 1500 }));
    expect(amounts(result)).toEqual({
      submitted: 1500,
      covered: 1300,
      copay: 200,
      deductible: 0,
      memberPays: 200,
      decision: Decision.PARTIALLY_COVERED,
    });
  });

  it('denies an expense absorbed by the deductible and only consumes the deductible', () => {
    const policy = samplePolicy();
    const ledger = BenefitLedger.open(policy);
    const result = adjudicate(expense({ amount: 800 }), policy, ledger);

    expect(amounts(result)).toEqual({
      submitted: 800,
      covered: 0,
      copay: 0,
      deductible: 800,
      memberPays: 800,
      decision: Decision.DENIED,
    });
    expect(result.reason).toContain('applied to deductible');
    expect(result.reason).toContain('200 THB deductible remaining');
    expect(ledger.deductibleRemaining('OUTPATIENT').toMajor()).toBe(200);
    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(20000);
    expect(ledger.remainingVisits('OUTPATIENT', 'Doctor Visit')).toBe(5);
  });

  it('denies an invalid expense with its validation reasons and leaves the ledger unchanged', () => {
    const ledger = BenefitLedger.open(noDeductible);
    const invalid: InvalidExpense = {
      invalid: true,
      expenseId: 'EXP-X',
      date: '2024-02-30',
      benefitType: 'OUTPATIENT',
      subBenefit: 'Doctor Visit',
      submitted: Money.zero(),
      reasons: ['amount: must be a positive number', 'date: must be a valid YYYY-MM-DD date'],
    };

    const result = adjudicate(invalid, noDeductible, ledger);

    expect(amounts(result)).toEqual({
      submitted: 0,
      covered: 0,
      copay: 0,
      deductible: 0,
      memberPays: 0,
      decision: Decision.DENIED,
    });
    expect(result.reason).toBe(
      'Denied: invalid expense — amount: must be a positive number; date: must be a valid YYYY-MM-DD date.',
    );
    expect(result.remainingAnnualLimit?.toMajor()).toBe(20000);
    expect(result.remainingVisitLimit).toBe(5);
  });

  it('reports no remaining balances for a benefit the policy does not cover', () => {
    const result = adjudicate(expense({ type: 'VISION', sub: 'Glasses' }));
    expect(result.decision).toBe(Decision.DENIED);
    expect(result.remainingAnnualLimit).toBeNull();
    expect(result.remainingVisitLimit).toBeNull();
  });

  it('keeps member pays equal to submitted minus covered', () => {
    const results = [
      expense({ amount: 4000 }),
      expense({ amount: 900 }),
      expense({ type: 'INPATIENT', sub: 'Surgery', amount: 160000 }),
    ].map((item) => adjudicate(item));
    results.forEach((result) => {
      expect(result.memberPays.add(result.covered).equals(result.submitted)).toBe(true);
    });
  });
});

// Hand-calculated in specs/001-policy-benefits-calculator/sample-scenario.md.
type Row = [string, number, number, number, number, Decision, number, number | null];
const { COVERED: C, PARTIALLY_COVERED: P, DENIED: D } = Decision;
const WORKSHEET: Row[] = [
  ['EXP-001', 1200, 300, 1000, 1300, P, 18800, 4],
  ['EXP-002', 40000, 0, 0, 0, C, 160000, null],
  ['EXP-003', 2500, 500, 0, 1500, P, 16300, 3],
  ['EXP-004', 0, 0, 0, 3000, D, 10000, null],
  ['EXP-005', 1300, 200, 0, 200, P, 15000, null],
  ['EXP-006', 20000, 0, 0, 10000, P, 140000, null],
  ['EXP-007', 0, 0, 0, 1800, D, 15000, 3],
  ['EXP-008', 3500, 500, 0, 500, P, 11500, null],
  ['EXP-009', 2100, 900, 0, 900, P, 7900, null],
  ['EXP-010', 2500, 500, 0, 2500, P, 9000, null],
  ['EXP-011', 0, 0, 0, 1200, D, 9000, null],
  ['EXP-012', 2500, 0, 0, 0, C, 137500, null],
  ['EXP-013', 0, 0, 0, 2000, D, 9000, 3],
  ['EXP-014', 0, 0, 0, 5000, D, 50000, null],
  ['EXP-015', 2500, 500, 0, 500, P, 6500, 2],
  ['EXP-016', 2500, 500, 0, 500, P, 4000, 1],
  ['EXP-017', 2500, 500, 0, 500, P, 1500, 0],
  ['EXP-018', 1500, 200, 0, 500, P, 0, null],
  ['EXP-019', 0, 0, 0, 1500, D, 0, 0],
  ['EXP-020', 6000, 0, 0, 0, C, 44000, null],
];

const row = (result: ExpenseResult): Row => [
  result.expenseId,
  result.covered.toMajor(),
  result.copay.toMajor(),
  result.deductibleApplied.toMajor(),
  result.memberPays.toMajor(),
  result.decision,
  result.remainingAnnualLimit?.toMajor() ?? -1,
  result.remainingVisitLimit,
];

describe('BenefitsCalculator.calculate (several expenses)', () => {
  const policy = samplePolicy();

  it('reproduces every row of the hand-calculated 20-expense worksheet', () => {
    const { results } = BenefitsCalculator.calculate(policy, sampleExpenses());
    expect(results.map(row)).toEqual(WORKSHEET);
  });

  it('US2-AS1: processes expenses by date, then expense_id', () => {
    const { results } = BenefitsCalculator.calculate(policy, [
      expense({ id: 'B', date: '2024-03-01' }),
      expense({ id: 'A', date: '2024-03-01' }),
      expense({ id: 'C', date: '2024-01-15' }),
    ]);
    expect(results.map((result) => result.expenseId)).toEqual(['C', 'A', 'B']);
  });

  it('lets earlier expenses consume the shared Diagnostic Tests limit', () => {
    const { results } = BenefitsCalculator.calculate(policy, sampleExpenses());
    const chain = results.filter((result) =>
      ['EXP-008', 'EXP-010', 'EXP-011'].includes(result.expenseId),
    );
    expect(chain.map((result) => result.covered.toMajor())).toEqual([3500, 2500, 0]);
    expect(chain[1].reason).toContain(
      'limited by remaining Diagnostic Tests annual sub-limit (2,500 THB); 2,000 THB above limit',
    );
    expect(chain[2].reason).toBe(
      'Denied: Diagnostic Tests annual sub-limit exhausted (6,000 THB of 6,000 THB used).',
    );
  });

  it('US2-AS6: a denied expense consumes no limit, visit or deductible', () => {
    const ledger = BenefitLedger.open(policy);
    ledger.commit({
      type: 'OUTPATIENT',
      subBenefit: 'Diagnostic Tests',
      covered: Money.fromMajor(6000),
      deductible: Money.zero(),
      visits: 0,
      days: 0,
    });

    const result = BenefitsCalculator.adjudicate(
      policy,
      ledger,
      expense({ sub: 'Diagnostic Tests', amount: 500 }),
    );

    expect(result.decision).toBe(Decision.DENIED);
    expect(ledger.deductibleRemaining('OUTPATIENT').toMajor()).toBe(1000);
    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(14000);
  });

  it('denies a repeated expense_id after the first occurrence', () => {
    const { results } = BenefitsCalculator.calculate(policy, [
      expense({ id: 'EXP-1', date: '2024-02-01', amount: 2000 }),
      expense({ id: 'EXP-1', date: '2024-03-01', amount: 2000 }),
    ]);
    expect(results[0].decision).toBe(Decision.PARTIALLY_COVERED);
    expect(results[1].decision).toBe(Decision.DENIED);
    expect(results[1].reason).toBe(
      'Denied: duplicate expense_id "EXP-1" (already processed in this run).',
    );
  });

  it('sorts invalid expenses without a valid date last', () => {
    const invalid: InvalidExpense = {
      invalid: true,
      expenseId: 'AAA',
      date: 'not-a-date',
      benefitType: null,
      subBenefit: null,
      submitted: Money.zero(),
      reasons: ['date: must be a valid YYYY-MM-DD date'],
    };
    const { results } = BenefitsCalculator.calculate(policy, [invalid, expense({ id: 'ZZZ' })]);
    expect(results.map((result) => result.expenseId)).toEqual(['ZZZ', 'AAA']);
  });

  it('gives identical output in any order when duplicate ids share a date', () => {
    const small = expense({
      id: 'D1',
      date: '2024-02-01',
      amount: 100,
      type: 'INPATIENT',
      sub: 'Surgery',
    });
    const large = expense({
      id: 'D1',
      date: '2024-02-01',
      amount: 900,
      type: 'INPATIENT',
      sub: 'Surgery',
    });
    const forward = BenefitsCalculator.calculate(policy, [small, large]);
    const backward = BenefitsCalculator.calculate(policy, [large, small]);
    expect(backward.results.map(row)).toEqual(forward.results.map(row));
    expect(backward.summary.totals.covered.equals(forward.summary.totals.covered)).toBe(true);
  });

  it('gives identical output in any order for undated expenses without ids', () => {
    const invalid = (minor: number): InvalidExpense => ({
      invalid: true,
      expenseId: '<missing>',
      date: null,
      benefitType: null,
      subBenefit: null,
      submitted: Money.fromMinor(minor),
      reasons: ['expense_id: should not be empty'],
    });
    const forward = BenefitsCalculator.calculate(policy, [invalid(500), invalid(700)]);
    const backward = BenefitsCalculator.calculate(policy, [invalid(700), invalid(500)]);
    expect(backward.results.map((result) => result.submitted.minor)).toEqual(
      forward.results.map((result) => result.submitted.minor),
    );
  });

  it('returns no results for an empty list', () => {
    expect(BenefitsCalculator.calculate(policy, []).results).toEqual([]);
  });

  it('returns the run summary with the results', () => {
    const { summary } = BenefitsCalculator.calculate(policy, sampleExpenses());
    expect(summary.expenseCount).toBe(20);
    expect(summary.totals.covered.toMajor()).toBe(90600);
    expect(summary.benefits[1].remaining.isZero()).toBe(true);
  });
});
