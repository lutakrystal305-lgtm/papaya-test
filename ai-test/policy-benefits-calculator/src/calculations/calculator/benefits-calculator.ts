import { BenefitLedger } from './benefit-ledger';
import { Expense, isInvalid, ParsedExpense } from '../interfaces/expense.interface';
import { decide, ExpenseResult } from '../interfaces/expense-result.interface';
import { findBenefit, findSubBenefit, Policy } from '../interfaces/policy.interface';
import { ReasonTemplates } from './reason-templates';
import { AdjudicationContext, createContext, isDenial, Step } from './rules/adjudication-context';
import { applyCap, applyCopay, applyDeductible, applyRemainingLimits } from './rules/amount-steps';
import {
  checkAvailability,
  checkExclusion,
  checkPolicyPeriod,
  checkWaitingPeriod,
  resolveBenefit,
} from './rules/eligibility-steps';
import { runPipeline } from './rules/pipeline';
import { buildRunSummary, RunSummary } from './run-summary';
import { Decision, MISSING_EXPENSE_ID } from '../calculations.constants';
import { IsoDate } from '../utils/iso-date';
import { Money } from '../utils/money';

// FR-009 order, after validation and benefit lookup.
const STEPS: readonly Step[] = [
  checkPolicyPeriod,
  checkExclusion,
  checkWaitingPeriod,
  checkAvailability,
  applyCap,
  applyDeductible,
  applyCopay,
  applyRemainingLimits,
];

interface Identity {
  readonly expenseId: string;
  readonly date: string | null;
  readonly benefitType: string | null;
  readonly subBenefit: string | null;
}

interface Outcome {
  readonly submitted: Money;
  readonly covered: Money;
  readonly copay: Money;
  readonly deductibleApplied: Money;
  readonly reason: string;
}

const denied = (submitted: Money, reason: string, deductibleApplied = Money.zero()): Outcome => ({
  submitted,
  covered: Money.zero(),
  copay: Money.zero(),
  deductibleApplied,
  reason,
});

const identityOf = (expense: ParsedExpense): Identity =>
  isInvalid(expense)
    ? expense
    : {
        expenseId: expense.expenseId,
        date: expense.date.toString(),
        benefitType: expense.benefitType,
        subBenefit: expense.subBenefit,
      };

const remainingBalances = (policy: Policy, ledger: BenefitLedger, identity: Identity) => {
  const { benefitType, subBenefit } = identity;
  const benefit = benefitType === null ? undefined : findBenefit(policy, benefitType);
  const resolved =
    benefitType === null || subBenefit === null
      ? undefined
      : findSubBenefit(policy, benefitType, subBenefit);
  return {
    remainingAnnualLimit: benefit ? ledger.remainingBenefit(benefit.type) : null,
    remainingVisitLimit: resolved
      ? ledger.remainingVisits(resolved.benefit.type, resolved.subBenefit.name)
      : null,
  };
};

const approvedReason = (ctx: AdjudicationContext): string => {
  const currency = ctx.policy.currency;
  if (decide(ctx.expense.amount, ctx.covered) === Decision.COVERED) {
    return ReasonTemplates.fullyCovered(ctx.covered.format(currency));
  }
  const memberPays = ctx.expense.amount.subtractFloor0(ctx.covered);
  const summary = ReasonTemplates.summary(
    ctx.covered.format(currency),
    memberPays.format(currency),
  );
  return [...ctx.fragments, summary].join(' ');
};

const commitApproved = (ledger: BenefitLedger, ctx: AdjudicationContext): void => {
  const used = ctx.covered.isZero() ? 0 : 1;
  ledger.commit({
    type: ctx.benefit.type,
    subBenefit: ctx.subBenefit.name,
    covered: ctx.covered,
    deductible: ctx.deductibleApplied,
    visits: used,
    days: used * ctx.daysToUse,
  });
};

const adjudicateValid = (policy: Policy, ledger: BenefitLedger, expense: Expense): Outcome => {
  const resolved = resolveBenefit(policy, expense);
  if (isDenial(resolved)) {
    return denied(expense.amount, resolved.reason);
  }
  const result = runPipeline(createContext(policy, ledger, expense, resolved), STEPS);
  if (isDenial(result)) {
    if (!result.deductibleApplied.isZero()) {
      ledger.commitDeductibleOnly(resolved.benefit.type, result.deductibleApplied);
    }
    return denied(expense.amount, result.reason, result.deductibleApplied);
  }
  commitApproved(ledger, result);
  const { covered, copay, deductibleApplied } = result;
  return {
    submitted: expense.amount,
    covered,
    copay,
    deductibleApplied,
    reason: approvedReason(result),
  };
};

export interface CalculationResult {
  readonly results: readonly ExpenseResult[];
  readonly summary: RunSummary;
}

const sortDay = (expense: ParsedExpense): number => {
  if (!isInvalid(expense)) {
    return expense.date.dayNumber;
  }
  return IsoDate.isValid(expense.date)
    ? IsoDate.parse(expense.date).dayNumber
    : Number.POSITIVE_INFINITY;
};

const compareIds = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
};

// Every field that can affect the output, so items with the same date and id still sort the same way.
const contentKey = (expense: ParsedExpense): string =>
  (isInvalid(expense)
    ? [
        '1',
        expense.submitted.minor,
        expense.date,
        expense.benefitType,
        expense.subBenefit,
        ...expense.reasons,
      ]
    : [
        '0',
        expense.amount.minor,
        expense.benefitType,
        expense.subBenefit,
        expense.diagnosis,
        expense.provider,
        expense.days,
      ]
  ).join('\u0000');

// Chronological, then expense_id, then content; NaN (both undated) falls through to the tie-breaks.
const sortForProcessing = (expenses: readonly ParsedExpense[]): ParsedExpense[] =>
  [...expenses].sort(
    (a, b) =>
      sortDay(a) - sortDay(b) ||
      compareIds(a.expenseId, b.expenseId) ||
      compareIds(contentKey(a), contentKey(b)),
  );

const submittedOf = (expense: ParsedExpense): Money =>
  isInvalid(expense) ? expense.submitted : expense.amount;

const toResult = (
  policy: Policy,
  ledger: BenefitLedger,
  identity: Identity,
  outcome: Outcome,
): ExpenseResult => ({
  expenseId: identity.expenseId,
  date: identity.date,
  benefitType: identity.benefitType,
  subBenefit: identity.subBenefit,
  ...outcome,
  memberPays: outcome.submitted.subtractFloor0(outcome.covered),
  decision: decide(outcome.submitted, outcome.covered),
  ...remainingBalances(policy, ledger, identity),
});

export class BenefitsCalculator {
  static adjudicate(policy: Policy, ledger: BenefitLedger, expense: ParsedExpense): ExpenseResult {
    const outcome = isInvalid(expense)
      ? denied(expense.submitted, ReasonTemplates.invalidExpense(expense.reasons))
      : adjudicateValid(policy, ledger, expense);
    return toResult(policy, ledger, identityOf(expense), outcome);
  }

  static calculate(policy: Policy, expenses: readonly ParsedExpense[]): CalculationResult {
    const ledger = BenefitLedger.open(policy);
    const seen = new Set<string>();
    const results = sortForProcessing(expenses).map((expense) => {
      const { expenseId } = expense;
      if (seen.has(expenseId) && expenseId !== MISSING_EXPENSE_ID) {
        const reason = ReasonTemplates.duplicateExpense(expenseId);
        return toResult(policy, ledger, identityOf(expense), denied(submittedOf(expense), reason));
      }
      seen.add(expenseId);
      return BenefitsCalculator.adjudicate(policy, ledger, expense);
    });
    return { results, summary: buildRunSummary(policy, ledger.snapshot(), results) };
  }
}
