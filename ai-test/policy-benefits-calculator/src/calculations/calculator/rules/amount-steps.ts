import { effectiveCopay, PerExpenseCap } from '../../interfaces/policy.interface';
import { CAP_LABELS, ReasonTemplates } from '../reason-templates';
import { CapKind } from '../../calculations.constants';
import { Money } from '../../utils/money';
import { AdjudicationContext, deny, formatMoney, Step } from './adjudication-context';

const daysAvailable = (ctx: AdjudicationContext): number => {
  const remaining = ctx.ledger.remainingDays(ctx.benefit.type, ctx.subBenefit.name);
  return remaining === null ? ctx.expense.days : Math.min(ctx.expense.days, remaining);
};

const applyPerDayCap = (ctx: AdjudicationContext, cap: PerExpenseCap): AdjudicationContext => {
  const days = daysAvailable(ctx);
  const limit = cap.amount.times(days);
  const eligible = Money.min(ctx.expense.amount, limit);
  const fragments = eligible.equals(ctx.expense.amount)
    ? ctx.fragments
    : [
        ...ctx.fragments,
        ReasonTemplates.perDayCap(
          formatMoney(ctx, cap.amount),
          days,
          formatMoney(ctx, limit),
          formatMoney(ctx, ctx.expense.amount.subtractFloor0(limit)),
        ),
      ];
  return { ...ctx, eligible, covered: eligible, daysToUse: days, fragments };
};

export const applyCap: Step = (ctx) => {
  const { cap } = ctx.subBenefit;
  if (!cap) {
    return ctx;
  }
  if (cap.kind === CapKind.PER_DAY) {
    return applyPerDayCap(ctx, cap);
  }
  if (!ctx.expense.amount.isGreaterThan(cap.amount)) {
    return ctx;
  }
  const fragment = ReasonTemplates.perExpenseCap(
    CAP_LABELS[cap.kind],
    formatMoney(ctx, cap.amount),
    formatMoney(ctx, ctx.expense.amount.subtractFloor0(cap.amount)),
  );
  return {
    ...ctx,
    eligible: cap.amount,
    covered: cap.amount,
    fragments: [...ctx.fragments, fragment],
  };
};

export const applyDeductible: Step = (ctx) => {
  const available = ctx.ledger.deductibleRemaining(ctx.benefit.type);
  const applied = Money.min(available, ctx.eligible);
  if (applied.isZero()) {
    return ctx;
  }
  const remainingAfter = formatMoney(ctx, available.subtractFloor0(applied));
  const payable = ctx.eligible.subtractFloor0(applied);
  if (payable.isZero()) {
    const reason = ReasonTemplates.deductibleOnly(formatMoney(ctx, applied), remainingAfter);
    return deny([...ctx.fragments, reason].join(' '), applied);
  }
  const fragment = ReasonTemplates.deductible(formatMoney(ctx, applied), remainingAfter);
  return {
    ...ctx,
    deductibleApplied: applied,
    covered: payable,
    fragments: [...ctx.fragments, fragment],
  };
};

const describeCopay = (ctx: AdjudicationContext, base: Money, copay: Money): string => {
  const rule = effectiveCopay(ctx);
  if (rule?.fixedPerVisit) {
    return ReasonTemplates.fixedCopay(formatMoney(ctx, copay));
  }
  const percentage = rule?.percentage ?? 0;
  return rule?.maxPerVisit && rule.isCapped(base)
    ? ReasonTemplates.cappedPercentageCopay(
        percentage,
        formatMoney(ctx, rule.maxPerVisit),
        formatMoney(ctx, copay),
      )
    : ReasonTemplates.percentageCopay(percentage, formatMoney(ctx, copay));
};

export const applyCopay: Step = (ctx) => {
  const rule = effectiveCopay(ctx);
  if (!rule || rule.isZero()) {
    return ctx;
  }
  const copay = rule.apply(ctx.covered);
  const fragment = describeCopay(ctx, ctx.covered, copay);
  return {
    ...ctx,
    copay,
    covered: ctx.covered.subtractFloor0(copay),
    fragments: [...ctx.fragments, fragment],
  };
};

interface LimitCandidate {
  readonly name: string;
  readonly remaining: Money;
}

const limitCandidates = (ctx: AdjudicationContext): LimitCandidate[] => {
  const { type, limitKind } = ctx.benefit;
  const subRemaining = ctx.ledger.remainingSubYear(type, ctx.subBenefit.name);
  const benefit = {
    name: ReasonTemplates.benefitLimitName(type, limitKind),
    remaining: ctx.ledger.remainingBenefit(type),
  };
  return subRemaining === null
    ? [benefit]
    : [
        { name: ReasonTemplates.subBenefitLimitName(ctx.subBenefit.name), remaining: subRemaining },
        benefit,
      ];
};

// Copay is already taken from the uncapped amount; only the insurer's share is capped (clarification Q2).
export const applyRemainingLimits: Step = (ctx) => {
  const binding = limitCandidates(ctx).reduce((tightest, candidate) =>
    candidate.remaining.isGreaterThan(tightest.remaining) ||
    candidate.remaining.equals(tightest.remaining)
      ? tightest
      : candidate,
  );
  if (!ctx.covered.isGreaterThan(binding.remaining)) {
    return ctx;
  }
  const fragment = ReasonTemplates.limitBound(
    binding.name,
    formatMoney(ctx, binding.remaining),
    formatMoney(ctx, ctx.covered.subtractFloor0(binding.remaining)),
  );
  return { ...ctx, covered: binding.remaining, fragments: [...ctx.fragments, fragment] };
};
