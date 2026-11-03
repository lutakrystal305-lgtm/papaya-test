import { Decision, LimitKind } from '../calculations.constants';

// Snake_case transport shape of contracts/calculation-output.schema.json.
export interface ExpenseResultOutput {
  readonly expense_id: string;
  readonly date: string | null;
  readonly benefit_type: string | null;
  readonly sub_benefit: string | null;
  readonly submitted_amount: number;
  readonly covered_amount: number;
  readonly copay_amount: number;
  readonly deductible_applied: number;
  readonly member_pays: number;
  readonly decision: Decision;
  readonly reason: string;
  readonly remaining_annual_limit: number | null;
  readonly remaining_visit_limit: number | null;
}

export interface CounterOutput {
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
}

export interface SubBenefitSummaryOutput {
  readonly name: string;
  readonly used: number;
  readonly year_limit: { readonly limit: number; readonly remaining: number } | null;
  readonly visits: CounterOutput | null;
  readonly days: CounterOutput | null;
}

export interface BenefitSummaryOutput {
  readonly type: string;
  readonly limit_kind: LimitKind;
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  readonly deductible: {
    readonly amount: number;
    readonly used: number;
    readonly remaining: number;
  } | null;
  readonly sub_benefits: readonly SubBenefitSummaryOutput[];
}

export interface RunSummaryOutput {
  readonly policy_number: string;
  readonly currency: string;
  readonly expense_count: number;
  readonly totals: {
    readonly submitted: number;
    readonly covered: number;
    readonly copay: number;
    readonly deductible: number;
    readonly member_pays: number;
  };
  readonly decisions: Readonly<Record<Decision, number>>;
  readonly benefits: readonly BenefitSummaryOutput[];
}

export interface CalculationOutput {
  readonly results: readonly ExpenseResultOutput[];
  readonly summary: RunSummaryOutput;
}

export interface CalculationBundle {
  readonly output: CalculationOutput;
  readonly report: string;
}
