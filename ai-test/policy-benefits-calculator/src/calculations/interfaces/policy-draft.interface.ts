// Raw, camelCase policy input consumed by PolicyFactory. Values are primitives and unvalidated.
export interface CopayDraft {
  readonly percentage?: number;
  readonly maxPerVisit?: number;
  readonly fixedPerVisit?: number;
}

export interface SubBenefitDraft {
  readonly name: string;
  readonly limitPerVisit?: number;
  readonly limitPerEvent?: number;
  readonly limitPerDay?: number;
  readonly maxDays?: number;
  readonly limitPerYear?: number;
  readonly visitsPerYear?: number;
  readonly copay?: CopayDraft;
}

export interface BenefitDraft {
  readonly type: string;
  readonly annualLimit?: number;
  readonly lifetimeLimit?: number;
  readonly waitingPeriodDays?: number;
  readonly deductible?: number;
  readonly copay?: CopayDraft;
  readonly subBenefits: readonly SubBenefitDraft[];
}

export interface ExclusionDraft {
  readonly label: string;
  readonly terms: readonly string[];
}

export interface PolicyDraft {
  readonly policyNumber: string;
  readonly planName?: string;
  readonly effectiveDate: string;
  readonly expiryDate: string;
  readonly currency: string;
  readonly benefits: readonly BenefitDraft[];
  readonly exclusions?: readonly ExclusionDraft[];
}
