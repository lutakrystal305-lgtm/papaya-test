import { Expense } from '../../interfaces/expense.interface';
import { findSubBenefit, Policy, ResolvedBenefit } from '../../interfaces/policy.interface';
import { ReasonTemplates } from '../reason-templates';
import { AdjudicationContext, Denial, deny, formatMoney, Step } from './adjudication-context';

export const resolveBenefit = (policy: Policy, expense: Expense): ResolvedBenefit | Denial =>
  findSubBenefit(policy, expense.benefitType, expense.subBenefit) ??
  deny(ReasonTemplates.notCovered(expense.benefitType, expense.subBenefit));

export const checkPolicyPeriod: Step = (ctx) => {
  const { effectiveDate, expiryDate } = ctx.policy;
  const { date } = ctx.expense;
  if (date.isBefore(effectiveDate) || date.isAfter(expiryDate)) {
    return deny(
      ReasonTemplates.outsidePolicyPeriod(
        date.toString(),
        effectiveDate.toString(),
        expiryDate.toString(),
      ),
    );
  }
  return ctx;
};

export const checkExclusion: Step = (ctx) => {
  const diagnosis = ctx.expense.diagnosis.toLowerCase();
  for (const exclusion of ctx.policy.exclusions) {
    const term = exclusion.terms.find((candidate) => diagnosis.includes(candidate.toLowerCase()));
    if (term !== undefined) {
      return deny(ReasonTemplates.excluded(exclusion.label, term));
    }
  }
  return ctx;
};

export const checkWaitingPeriod: Step = (ctx) => {
  const { waitingPeriodDays, type } = ctx.benefit;
  const eligibleFrom = ctx.policy.effectiveDate.addDays(waitingPeriodDays);
  if (ctx.expense.date.isBefore(eligibleFrom)) {
    return deny(
      ReasonTemplates.waitingPeriod(
        type,
        waitingPeriodDays,
        eligibleFrom.toString(),
        ctx.expense.date.daysUntil(eligibleFrom),
      ),
    );
  }
  return ctx;
};

const visitsExhausted = (ctx: AdjudicationContext): string | null => {
  const limit = ctx.subBenefit.visitsPerYear;
  const remaining = ctx.ledger.remainingVisits(ctx.benefit.type, ctx.subBenefit.name);
  return limit !== null && remaining !== null && remaining <= 0
    ? ReasonTemplates.visitsExhausted(ctx.subBenefit.name, limit, limit)
    : null;
};

const daysExhausted = (ctx: AdjudicationContext): string | null => {
  const limit = ctx.subBenefit.cap?.maxDays ?? null;
  const remaining = ctx.ledger.remainingDays(ctx.benefit.type, ctx.subBenefit.name);
  return limit !== null && remaining !== null && remaining <= 0
    ? ReasonTemplates.daysExhausted(ctx.subBenefit.name, limit, limit)
    : null;
};

const subLimitExhausted = (ctx: AdjudicationContext): string | null => {
  const { yearLimit, name } = ctx.subBenefit;
  const remaining = ctx.ledger.remainingSubYear(ctx.benefit.type, name);
  return yearLimit && remaining?.isZero()
    ? ReasonTemplates.limitExhausted(
        ReasonTemplates.subBenefitLimitName(name),
        formatMoney(ctx, yearLimit),
      )
    : null;
};

const benefitLimitExhausted = (ctx: AdjudicationContext): string | null => {
  const { type, limitKind, limit } = ctx.benefit;
  return ctx.ledger.remainingBenefit(type).isZero()
    ? ReasonTemplates.limitExhausted(
        ReasonTemplates.benefitLimitName(type, limitKind),
        formatMoney(ctx, limit),
      )
    : null;
};

// Runs before the deductible step so an exhausted limit never consumes the deductible (R-09).
export const checkAvailability: Step = (ctx) => {
  const reason =
    visitsExhausted(ctx) ??
    daysExhausted(ctx) ??
    subLimitExhausted(ctx) ??
    benefitLimitExhausted(ctx);
  return reason === null ? ctx : deny(reason);
};
