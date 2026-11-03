import {
  BenefitDraft,
  CopayDraft,
  ExclusionDraft,
  PolicyDraft,
  SubBenefitDraft,
} from '../interfaces/policy-draft.interface';
import { isRecord } from '../utils/validation-errors';

// Maps a possibly-invalid DTO to a PolicyDraft without throwing, so cross-field rules can still run.
type Loose = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const num = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return typeof value === 'number' ? value : Number.NaN;
};

const records = (value: unknown): Loose[] =>
  Array.isArray(value) ? value.map((item: unknown) => (isRecord(item) ? item : {})) : [];

const toCopay = (value: unknown): CopayDraft | undefined =>
  isRecord(value)
    ? {
        percentage: num(value.percentage),
        maxPerVisit: num(value.max_per_visit),
        fixedPerVisit: num(value.fixed_per_visit),
      }
    : undefined;

const toSubBenefit = (dto: Loose): SubBenefitDraft => ({
  name: text(dto.name),
  limitPerVisit: num(dto.limit_per_visit),
  limitPerEvent: num(dto.limit_per_event),
  limitPerDay: num(dto.limit_per_day),
  maxDays: num(dto.max_days),
  limitPerYear: num(dto.limit_per_year),
  visitsPerYear: num(dto.visits_per_year),
  copay: toCopay(dto.copay),
});

const toBenefit = (dto: Loose): BenefitDraft => ({
  type: text(dto.type),
  annualLimit: num(dto.annual_limit),
  lifetimeLimit: num(dto.lifetime_limit),
  waitingPeriodDays: num(dto.waiting_period_days),
  deductible: num(dto.deductible),
  copay: toCopay(dto.copay),
  subBenefits: records(dto.sub_benefits).map(toSubBenefit),
});

const toExclusion = (dto: Loose): ExclusionDraft => ({
  label: text(dto.label),
  terms: Array.isArray(dto.terms) ? dto.terms.map(text) : [],
});

export const toPolicyDraft = (dto: Loose): PolicyDraft => {
  const plan = isRecord(dto.plan) ? dto.plan : {};
  return {
    policyNumber: text(dto.policy_number),
    planName: typeof plan.name === 'string' ? plan.name : undefined,
    effectiveDate: text(plan.effective_date),
    expiryDate: text(plan.expiry_date),
    currency: text(plan.currency),
    benefits: records(dto.benefits).map(toBenefit),
    exclusions: records(dto.exclusions).map(toExclusion),
  };
};
