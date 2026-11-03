import { IsoDate } from '../utils/iso-date';
import { Money } from '../utils/money';

export interface Expense {
  readonly expenseId: string;
  readonly date: IsoDate;
  readonly benefitType: string;
  readonly subBenefit: string;
  readonly amount: Money;
  readonly diagnosis: string;
  readonly provider: string;
  readonly days: number;
}

// An expense that failed per-item validation. It is DENIED, never fatal (FR-007).
export interface InvalidExpense {
  readonly invalid: true;
  readonly expenseId: string;
  readonly date: string | null;
  readonly benefitType: string | null;
  readonly subBenefit: string | null;
  readonly submitted: Money;
  readonly reasons: readonly string[];
}

export type ParsedExpense = Expense | InvalidExpense;

export const isInvalid = (expense: ParsedExpense): expense is InvalidExpense =>
  'invalid' in expense;
