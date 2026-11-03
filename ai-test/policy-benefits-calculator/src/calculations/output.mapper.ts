import { CalculationResult } from './calculator/benefits-calculator';
import { ExpenseResult } from './interfaces/expense-result.interface';
import { BenefitSummary, RunSummary, SubBenefitSummary } from './calculator/run-summary';
import { Money } from './utils/money';
import {
  BenefitSummaryOutput,
  CalculationOutput,
  ExpenseResultOutput,
  RunSummaryOutput,
  SubBenefitSummaryOutput,
} from './interfaces/calculation-output.interface';

const major = (amount: Money): number => amount.toMajor();

const toResultOutput = (result: ExpenseResult): ExpenseResultOutput => ({
  expense_id: result.expenseId,
  date: result.date,
  benefit_type: result.benefitType,
  sub_benefit: result.subBenefit,
  submitted_amount: major(result.submitted),
  covered_amount: major(result.covered),
  copay_amount: major(result.copay),
  deductible_applied: major(result.deductibleApplied),
  member_pays: major(result.memberPays),
  decision: result.decision,
  reason: result.reason,
  remaining_annual_limit: result.remainingAnnualLimit ? major(result.remainingAnnualLimit) : null,
  remaining_visit_limit: result.remainingVisitLimit,
});

const toSubBenefitOutput = (sub: SubBenefitSummary): SubBenefitSummaryOutput => ({
  name: sub.name,
  used: major(sub.used),
  year_limit: sub.yearLimit
    ? { limit: major(sub.yearLimit.limit), remaining: major(sub.yearLimit.remaining) }
    : null,
  visits: sub.visits,
  days: sub.days,
});

const toBenefitOutput = (benefit: BenefitSummary): BenefitSummaryOutput => ({
  type: benefit.type,
  limit_kind: benefit.limitKind,
  limit: major(benefit.limit),
  used: major(benefit.used),
  remaining: major(benefit.remaining),
  deductible: benefit.deductible
    ? {
        amount: major(benefit.deductible.amount),
        used: major(benefit.deductible.used),
        remaining: major(benefit.deductible.remaining),
      }
    : null,
  sub_benefits: benefit.subBenefits.map(toSubBenefitOutput),
});

const toSummaryOutput = (summary: RunSummary): RunSummaryOutput => ({
  policy_number: summary.policyNumber,
  currency: summary.currency,
  expense_count: summary.expenseCount,
  totals: {
    submitted: major(summary.totals.submitted),
    covered: major(summary.totals.covered),
    copay: major(summary.totals.copay),
    deductible: major(summary.totals.deductible),
    member_pays: major(summary.totals.memberPays),
  },
  decisions: { ...summary.decisions },
  benefits: summary.benefits.map(toBenefitOutput),
});

export const toCalculationOutput = ({
  results,
  summary,
}: CalculationResult): CalculationOutput => ({
  results: results.map(toResultOutput),
  summary: toSummaryOutput(summary),
});
