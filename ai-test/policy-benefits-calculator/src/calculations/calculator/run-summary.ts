import { BenefitBalance, SubBenefitBalance } from './benefit-ledger';
import { ExpenseResult } from '../interfaces/expense-result.interface';
import { Policy } from '../interfaces/policy.interface';
import { Decision, LimitKind } from '../calculations.constants';
import { Money } from '../utils/money';

export interface Counter {
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
}

export interface SubBenefitSummary {
  readonly name: string;
  readonly used: Money;
  readonly yearLimit: { readonly limit: Money; readonly remaining: Money } | null;
  readonly visits: Counter | null;
  readonly days: Counter | null;
}

export interface BenefitSummary {
  readonly type: string;
  readonly limitKind: LimitKind;
  readonly limit: Money;
  readonly used: Money;
  readonly remaining: Money;
  readonly deductible: {
    readonly amount: Money;
    readonly used: Money;
    readonly remaining: Money;
  } | null;
  readonly subBenefits: readonly SubBenefitSummary[];
}

export interface RunTotals {
  readonly submitted: Money;
  readonly covered: Money;
  readonly copay: Money;
  readonly deductible: Money;
  readonly memberPays: Money;
}

export interface RunSummary {
  readonly policyNumber: string;
  readonly currency: string;
  readonly expenseCount: number;
  readonly totals: RunTotals;
  readonly decisions: Readonly<Record<Decision, number>>;
  readonly benefits: readonly BenefitSummary[];
}

const counter = (limit: number | null, used: number): Counter | null =>
  limit === null ? null : { limit, used, remaining: Math.max(0, limit - used) };

const summariseSubBenefit = (sub: SubBenefitBalance): SubBenefitSummary => ({
  name: sub.name,
  used: sub.used,
  yearLimit: sub.yearLimit
    ? { limit: sub.yearLimit, remaining: sub.yearLimit.subtractFloor0(sub.used) }
    : null,
  visits: counter(sub.visitsLimit, sub.visitsUsed),
  days: counter(sub.daysLimit, sub.daysUsed),
});

const summariseBenefit = (balance: BenefitBalance): BenefitSummary => ({
  type: balance.type,
  limitKind: balance.limitKind,
  limit: balance.limit,
  used: balance.used,
  remaining: balance.limit.subtractFloor0(balance.used),
  deductible: balance.deductible.isZero()
    ? null
    : {
        amount: balance.deductible,
        used: balance.deductibleUsed,
        remaining: balance.deductible.subtractFloor0(balance.deductibleUsed),
      },
  subBenefits: balance.subBenefits.map(summariseSubBenefit),
});

const sumOf = (results: readonly ExpenseResult[], pick: (result: ExpenseResult) => Money): Money =>
  Money.sum(results.map(pick));

const totalsOf = (results: readonly ExpenseResult[]): RunTotals => ({
  submitted: sumOf(results, (result) => result.submitted),
  covered: sumOf(results, (result) => result.covered),
  copay: sumOf(results, (result) => result.copay),
  deductible: sumOf(results, (result) => result.deductibleApplied),
  memberPays: sumOf(results, (result) => result.memberPays),
});

const countDecisions = (results: readonly ExpenseResult[]): Record<Decision, number> => {
  const counts: Record<Decision, number> = {
    [Decision.COVERED]: 0,
    [Decision.PARTIALLY_COVERED]: 0,
    [Decision.DENIED]: 0,
  };
  results.forEach((result) => {
    counts[result.decision] += 1;
  });
  return counts;
};

export const buildRunSummary = (
  policy: Policy,
  balances: readonly BenefitBalance[],
  results: readonly ExpenseResult[],
): RunSummary => ({
  policyNumber: policy.policyNumber,
  currency: policy.currency,
  expenseCount: results.length,
  totals: totalsOf(results),
  decisions: countDecisions(results),
  benefits: balances.map(summariseBenefit),
});
