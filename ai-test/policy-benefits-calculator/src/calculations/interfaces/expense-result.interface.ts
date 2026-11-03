import { Decision } from '../calculations.constants';
import { Money } from '../utils/money';

export interface ExpenseResult {
  readonly expenseId: string;
  readonly date: string | null;
  readonly benefitType: string | null;
  readonly subBenefit: string | null;
  readonly submitted: Money;
  readonly covered: Money;
  readonly copay: Money;
  readonly deductibleApplied: Money;
  readonly memberPays: Money;
  readonly decision: Decision;
  readonly reason: string;
  readonly remainingAnnualLimit: Money | null;
  readonly remainingVisitLimit: number | null;
}

export const decide = (submitted: Money, covered: Money): Decision => {
  if (covered.isZero()) {
    return Decision.DENIED;
  }
  return covered.equals(submitted) ? Decision.COVERED : Decision.PARTIALLY_COVERED;
};
