import { CapKind, LimitKind } from '../calculations.constants';
import { CopayRule } from '../utils/copay-rule';
import { Money } from '../utils/money';
import { CopayDraft, SubBenefitDraft } from '../interfaces/policy-draft.interface';
import { PerExpenseCap } from '../interfaces/policy.interface';
import { ViolationCollector } from './violation-collector';

export const positiveMoney = (
  violations: ViolationCollector,
  path: string,
  value: number | undefined,
): Money | null => {
  const amount = violations.attempt(path, () => Money.fromMajor(Number(value)));
  if (amount?.isZero()) {
    violations.addValue(path, 'must be greater than 0');
    return null;
  }
  return amount;
};

export const optionalPositiveMoney = (
  violations: ViolationCollector,
  path: string,
  value: number | undefined,
): Money | null => (value === undefined ? null : positiveMoney(violations, path, value));

export const optionalPositiveInteger = (
  violations: ViolationCollector,
  path: string,
  value: number | undefined,
): number | null => {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 1) {
    violations.addValue(path, 'must be a positive integer');
    return null;
  }
  return value;
};

export const buildCopay = (
  violations: ViolationCollector,
  path: string,
  draft: CopayDraft | undefined,
): CopayRule | null => {
  if (draft === undefined) {
    return null;
  }
  const hasPercentage = draft.percentage !== undefined;
  if (hasPercentage === (draft.fixedPerVisit !== undefined)) {
    violations.add(path, 'exactly one of percentage or fixed_per_visit is required');
    return null;
  }
  return violations.attempt(path, () =>
    hasPercentage
      ? CopayRule.percentage(
          Number(draft.percentage),
          draft.maxPerVisit === undefined ? undefined : Money.fromMajor(draft.maxPerVisit),
        )
      : CopayRule.fixed(Money.fromMajor(Number(draft.fixedPerVisit))),
  );
};

type CapCandidate = readonly [CapKind, number | undefined, string];

export const buildCap = (
  violations: ViolationCollector,
  path: string,
  draft: SubBenefitDraft,
): PerExpenseCap | null => {
  const candidates: CapCandidate[] = (
    [
      [CapKind.PER_VISIT, draft.limitPerVisit, 'limit_per_visit'],
      [CapKind.PER_EVENT, draft.limitPerEvent, 'limit_per_event'],
      [CapKind.PER_DAY, draft.limitPerDay, 'limit_per_day'],
    ] as const
  ).filter(([, value]) => value !== undefined);
  if (candidates.length > 1) {
    violations.add(
      path,
      'at most one of limit_per_visit, limit_per_event, limit_per_day may be set',
    );
    return null;
  }
  if (draft.maxDays !== undefined && draft.limitPerDay === undefined) {
    violations.add(path, 'max_days requires limit_per_day');
    return null;
  }
  if (candidates.length === 0) {
    return null;
  }
  const [kind, value, field] = candidates[0];
  const amount = positiveMoney(violations, `${path}.${field}`, value);
  const maxDays = optionalPositiveInteger(violations, `${path}.max_days`, draft.maxDays);
  return amount ? { kind, amount, maxDays } : null;
};

export interface BuiltLimit {
  readonly amount: Money;
  readonly kind: LimitKind;
}

export const buildLimit = (
  violations: ViolationCollector,
  path: string,
  annualLimit: number | undefined,
  lifetimeLimit: number | undefined,
): BuiltLimit | null => {
  const hasAnnual = annualLimit !== undefined;
  if (hasAnnual === (lifetimeLimit !== undefined)) {
    violations.add(path, 'exactly one of annual_limit or lifetime_limit is required');
    return null;
  }
  const amount = hasAnnual
    ? positiveMoney(violations, `${path}.annual_limit`, annualLimit)
    : positiveMoney(violations, `${path}.lifetime_limit`, lifetimeLimit);
  const kind = hasAnnual ? LimitKind.ANNUAL : LimitKind.LIFETIME;
  return amount ? { amount, kind } : null;
};
