import { BenefitLedger } from './benefit-ledger';
import { BenefitsCalculator } from './benefits-calculator';
import { Decision } from '../calculations.constants';
import { Money } from '../utils/money';
import { expense, sampleExpenses } from '../../testing/expense.builder';
import { samplePolicy } from '../../testing/policy.builder';
import { buildRunSummary, RunSummary } from './run-summary';

const plain = (value: unknown): unknown => {
  if (value instanceof Money) {
    return value.toMajor();
  }
  if (Array.isArray(value)) {
    return value.map(plain);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, plain(entry)]));
  }
  return value;
};

const policy = samplePolicy();

const summarise = (items = sampleExpenses()): RunSummary => {
  const ledger = BenefitLedger.open(policy);
  const results = items.map((item) => BenefitsCalculator.adjudicate(policy, ledger, item));
  return buildRunSummary(policy, ledger.snapshot(), results);
};

describe('buildRunSummary', () => {
  const summary = summarise();

  it('identifies the policy and expense count', () => {
    expect(summary).toMatchObject({
      policyNumber: 'POL-2024-TH-00789',
      currency: 'THB',
      expenseCount: 20,
    });
  });

  it('US3-AS3: totals reconcile with the hand-calculated sample', () => {
    expect(plain(summary.totals)).toEqual({
      submitted: 124000,
      covered: 90600,
      copay: 4600,
      deductible: 1000,
      memberPays: 33400,
    });
    expect(
      summary.totals.covered.add(summary.totals.memberPays).equals(summary.totals.submitted),
    ).toBe(true);
  });

  it('US3-AS3: decision counts add up to the number of expenses', () => {
    expect(summary.decisions).toEqual({
      [Decision.COVERED]: 3,
      [Decision.PARTIALLY_COVERED]: 11,
      [Decision.DENIED]: 6,
    });
  });

  it('US3-AS1: reports limit, used and remaining per benefit type', () => {
    expect(
      summary.benefits.map((benefit) => plain({ ...benefit, subBenefits: undefined })),
    ).toEqual([
      {
        type: 'INPATIENT',
        limitKind: 'ANNUAL',
        limit: 200000,
        used: 62500,
        remaining: 137500,
        deductible: null,
        subBenefits: undefined,
      },
      {
        type: 'OUTPATIENT',
        limitKind: 'ANNUAL',
        limit: 20000,
        used: 20000,
        remaining: 0,
        deductible: { amount: 1000, used: 1000, remaining: 0 },
        subBenefits: undefined,
      },
      {
        type: 'DENTAL',
        limitKind: 'ANNUAL',
        limit: 10000,
        used: 2100,
        remaining: 7900,
        deductible: null,
        subBenefits: undefined,
      },
      {
        type: 'MATERNITY',
        limitKind: 'LIFETIME',
        limit: 50000,
        used: 6000,
        remaining: 44000,
        deductible: null,
        subBenefits: undefined,
      },
    ]);
  });

  it('US3-AS2: reports used, year limit, visits and days per sub-benefit', () => {
    expect(summary.benefits.flatMap((benefit) => plain(benefit.subBenefits) as unknown[])).toEqual([
      {
        name: 'Room & Board',
        used: 20000,
        yearLimit: null,
        visits: null,
        days: { limit: 10, used: 5, remaining: 5 },
      },
      { name: 'Surgery', used: 40000, yearLimit: null, visits: null, days: null },
      { name: 'Ambulance', used: 2500, yearLimit: null, visits: null, days: null },
      {
        name: 'Doctor Visit',
        used: 11200,
        yearLimit: null,
        visits: { limit: 5, used: 5, remaining: 0 },
        days: null,
      },
      { name: 'Prescribed Medicine', used: 2800, yearLimit: null, visits: null, days: null },
      {
        name: 'Diagnostic Tests',
        used: 6000,
        yearLimit: { limit: 6000, remaining: 0 },
        visits: null,
        days: null,
      },
      {
        name: 'Basic Dental',
        used: 2100,
        yearLimit: { limit: 6000, remaining: 3900 },
        visits: null,
        days: null,
      },
      {
        name: 'Major Dental',
        used: 0,
        yearLimit: { limit: 4000, remaining: 4000 },
        visits: null,
        days: null,
      },
      {
        name: 'Prenatal Care',
        used: 6000,
        yearLimit: { limit: 15000, remaining: 9000 },
        visits: null,
        days: null,
      },
      { name: 'Normal Delivery', used: 0, yearLimit: null, visits: null, days: null },
    ]);
  });

  it('reports full balances and zero totals for an empty run', () => {
    const empty = summarise([]);
    expect(empty.expenseCount).toBe(0);
    expect(empty.totals.submitted.isZero()).toBe(true);
    expect(empty.benefits[1].remaining.toMajor()).toBe(20000);
  });

  it('includes deductible-only denials in the deductible total', () => {
    const partial = summarise([expense({ amount: 600 })]);
    expect(partial.totals.deductible.toMajor()).toBe(600);
    expect(partial.decisions[Decision.DENIED]).toBe(1);
  });
});
