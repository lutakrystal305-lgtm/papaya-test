import { CapKind, LimitKind } from '../calculations.constants';
import { CopayRule } from '../utils/copay-rule';
import { IsoDate } from '../utils/iso-date';
import { Money } from '../utils/money';

export interface PerExpenseCap {
  readonly kind: CapKind;
  readonly amount: Money;
  readonly maxDays: number | null;
}

export interface SubBenefit {
  readonly name: string;
  readonly cap: PerExpenseCap | null;
  readonly yearLimit: Money | null;
  readonly visitsPerYear: number | null;
  readonly copay: CopayRule | null;
}

export interface BenefitType {
  readonly type: string;
  readonly limit: Money;
  readonly limitKind: LimitKind;
  readonly waitingPeriodDays: number;
  readonly deductible: Money;
  readonly copay: CopayRule | null;
  readonly subBenefits: readonly SubBenefit[];
}

export interface Exclusion {
  readonly label: string;
  readonly terms: readonly string[];
}

export interface Policy {
  readonly policyNumber: string;
  readonly planName: string | null;
  readonly effectiveDate: IsoDate;
  readonly expiryDate: IsoDate;
  readonly currency: string;
  readonly benefits: readonly BenefitType[];
  readonly exclusions: readonly Exclusion[];
}

export interface ResolvedBenefit {
  readonly benefit: BenefitType;
  readonly subBenefit: SubBenefit;
}

export const findBenefit = (policy: Policy, type: string): BenefitType | undefined =>
  policy.benefits.find((benefit) => benefit.type === type);

export const findSubBenefit = (
  policy: Policy,
  type: string,
  name: string,
): ResolvedBenefit | undefined => {
  const benefit = findBenefit(policy, type);
  const subBenefit = benefit?.subBenefits.find((candidate) => candidate.name === name);
  return benefit && subBenefit ? { benefit, subBenefit } : undefined;
};

export const effectiveCopay = ({ benefit, subBenefit }: ResolvedBenefit): CopayRule | null =>
  subBenefit.copay ?? benefit.copay;
