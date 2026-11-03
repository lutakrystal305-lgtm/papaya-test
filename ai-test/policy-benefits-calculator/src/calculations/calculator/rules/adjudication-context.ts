import { BenefitLedger } from '../benefit-ledger';
import { Expense } from '../../interfaces/expense.interface';
import {
  BenefitType,
  Policy,
  ResolvedBenefit,
  SubBenefit,
} from '../../interfaces/policy.interface';
import { Money } from '../../utils/money';

export type LedgerView = Pick<
  BenefitLedger,
  | 'remainingBenefit'
  | 'remainingSubYear'
  | 'remainingVisits'
  | 'remainingDays'
  | 'deductibleRemaining'
>;

// `covered` is the running payable amount: it shrinks as each amount step is applied.
export interface AdjudicationContext {
  readonly policy: Policy;
  readonly ledger: LedgerView;
  readonly expense: Expense;
  readonly benefit: BenefitType;
  readonly subBenefit: SubBenefit;
  readonly eligible: Money;
  readonly deductibleApplied: Money;
  readonly copay: Money;
  readonly covered: Money;
  readonly daysToUse: number;
  readonly fragments: readonly string[];
}

export interface Denial {
  readonly denied: true;
  readonly reason: string;
  readonly deductibleApplied: Money;
}

export type StepResult = AdjudicationContext | Denial;
export type Step = (ctx: AdjudicationContext) => StepResult;

export const deny = (reason: string, deductibleApplied: Money = Money.zero()): Denial => ({
  denied: true,
  reason,
  deductibleApplied,
});

export const isDenial = (value: object): value is Denial => 'denied' in value;

export const createContext = (
  policy: Policy,
  ledger: LedgerView,
  expense: Expense,
  { benefit, subBenefit }: ResolvedBenefit,
): AdjudicationContext => ({
  policy,
  ledger,
  expense,
  benefit,
  subBenefit,
  eligible: expense.amount,
  deductibleApplied: Money.zero(),
  copay: Money.zero(),
  covered: expense.amount,
  daysToUse: 0,
  fragments: [],
});

export const formatMoney = (ctx: AdjudicationContext, amount: Money): string =>
  amount.format(ctx.policy.currency);
