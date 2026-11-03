import { PolicyValidationError } from '../calculations.errors';
import { IsoDate } from '../utils/iso-date';
import { Money } from '../utils/money';
import {
  BenefitDraft,
  ExclusionDraft,
  PolicyDraft,
  SubBenefitDraft,
} from '../interfaces/policy-draft.interface';
import { BenefitType, Exclusion, Policy, SubBenefit } from '../interfaces/policy.interface';
import {
  buildCap,
  buildCopay,
  buildLimit,
  optionalPositiveInteger,
  optionalPositiveMoney,
} from './policy-builders';
import { ViolationCollector } from './violation-collector';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

interface PolicyPeriod {
  readonly effectiveDate: IsoDate;
  readonly expiryDate: IsoDate;
}

const buildPeriod = (violations: ViolationCollector, draft: PolicyDraft): PolicyPeriod | null => {
  const effectiveDate = violations.attempt('plan.effective_date', () =>
    IsoDate.parse(draft.effectiveDate),
  );
  const expiryDate = violations.attempt('plan.expiry_date', () => IsoDate.parse(draft.expiryDate));
  if (!effectiveDate || !expiryDate) {
    return null;
  }
  if (!expiryDate.isAfter(effectiveDate)) {
    violations.add('plan.expiry_date', 'must be after plan.effective_date');
    return null;
  }
  return { effectiveDate, expiryDate };
};

const buildSubBenefit = (
  violations: ViolationCollector,
  path: string,
  draft: SubBenefitDraft,
): SubBenefit => ({
  name: draft.name,
  cap: buildCap(violations, path, draft),
  yearLimit: optionalPositiveMoney(violations, `${path}.limit_per_year`, draft.limitPerYear),
  visitsPerYear: optionalPositiveInteger(
    violations,
    `${path}.visits_per_year`,
    draft.visitsPerYear,
  ),
  copay: buildCopay(violations, `${path}.copay`, draft.copay),
});

const buildSubBenefits = (
  violations: ViolationCollector,
  path: string,
  drafts: readonly SubBenefitDraft[],
): SubBenefit[] => {
  if (drafts.length === 0) {
    violations.addValue(`${path}.sub_benefits`, 'at least one sub-benefit is required');
  }
  const seen = new Set<string>();
  return drafts.map((draft, index) => {
    const subPath = `${path}.sub_benefits.${index}`;
    const subBenefit = buildSubBenefit(violations, subPath, draft);
    if (seen.has(draft.name)) {
      violations.add(subPath, `duplicate sub-benefit name "${draft.name}"`);
    }
    seen.add(draft.name);
    return subBenefit;
  });
};

const buildWaitingPeriod = (violations: ViolationCollector, path: string, days = 0): number => {
  if (!Number.isInteger(days) || days < 0) {
    violations.addValue(`${path}.waiting_period_days`, 'must be a non-negative integer');
  }
  return days;
};

const buildBenefit = (
  violations: ViolationCollector,
  path: string,
  draft: BenefitDraft,
): BenefitType | null => {
  const limit = buildLimit(violations, path, draft.annualLimit, draft.lifetimeLimit);
  const waitingPeriodDays = buildWaitingPeriod(violations, path, draft.waitingPeriodDays);
  const deductible = violations.attempt(`${path}.deductible`, () =>
    Money.fromMajor(draft.deductible ?? 0),
  );
  const copay = buildCopay(violations, `${path}.copay`, draft.copay);
  const subBenefits = buildSubBenefits(violations, path, draft.subBenefits);
  if (!limit || !deductible) {
    return null;
  }
  const { amount, kind } = limit;
  return {
    type: draft.type,
    limit: amount,
    limitKind: kind,
    waitingPeriodDays,
    deductible,
    copay,
    subBenefits,
  };
};

const buildBenefits = (
  violations: ViolationCollector,
  drafts: readonly BenefitDraft[],
): BenefitType[] => {
  if (drafts.length === 0) {
    violations.addValue('benefits', 'at least one benefit is required');
  }
  const seen = new Set<string>();
  const benefits = drafts.map((draft, index) => {
    const benefit = buildBenefit(violations, `benefits.${index}`, draft);
    if (seen.has(draft.type)) {
      violations.add(`benefits.${index}`, `duplicate benefit type "${draft.type}"`);
    }
    seen.add(draft.type);
    return benefit;
  });
  return benefits.filter((benefit): benefit is BenefitType => benefit !== null);
};

const buildExclusions = (
  violations: ViolationCollector,
  drafts: readonly ExclusionDraft[],
): Exclusion[] =>
  drafts.map((draft, index) => {
    if (!draft.label || draft.terms.length === 0 || draft.terms.some((term) => !term)) {
      violations.addValue(
        `exclusions.${index}`,
        'a label and at least one non-empty term are required',
      );
    }
    return { label: draft.label, terms: [...draft.terms] };
  });

const checkIdentity = (violations: ViolationCollector, draft: PolicyDraft): void => {
  if (!draft.policyNumber) {
    violations.addValue('policy_number', 'must not be empty');
  }
  if (!CURRENCY_PATTERN.test(draft.currency)) {
    violations.addValue('plan.currency', 'must be a 3-letter uppercase ISO 4217 code');
  }
};

export class PolicyFactory {
  static create(draft: PolicyDraft): Policy {
    const violations = new ViolationCollector();
    checkIdentity(violations, draft);
    const period = buildPeriod(violations, draft);
    const benefits = buildBenefits(violations, draft.benefits);
    const exclusions = buildExclusions(violations, draft.exclusions ?? []);
    if (violations.errors.length > 0 || !period) {
      throw new PolicyValidationError(violations.errors, violations.issues);
    }
    return {
      policyNumber: draft.policyNumber,
      planName: draft.planName ?? null,
      ...period,
      currency: draft.currency,
      benefits,
      exclusions,
    };
  }
}
