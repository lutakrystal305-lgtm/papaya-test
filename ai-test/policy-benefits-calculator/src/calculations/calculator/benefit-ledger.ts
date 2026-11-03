import { CapKind, LimitKind } from '../calculations.constants';
import { InvalidValueError } from '../calculations.errors';
import { BenefitType, Policy, SubBenefit } from '../interfaces/policy.interface';
import { Money } from '../utils/money';

export interface SubBenefitBalance {
  readonly name: string;
  readonly yearLimit: Money | null;
  readonly visitsLimit: number | null;
  readonly daysLimit: number | null;
  readonly used: Money;
  readonly visitsUsed: number;
  readonly daysUsed: number;
}

export interface BenefitBalance {
  readonly type: string;
  readonly limitKind: LimitKind;
  readonly limit: Money;
  readonly used: Money;
  readonly deductible: Money;
  readonly deductibleUsed: Money;
  readonly subBenefits: readonly SubBenefitBalance[];
}

export interface LedgerCommit {
  readonly type: string;
  readonly subBenefit: string;
  readonly covered: Money;
  readonly deductible: Money;
  readonly visits: number;
  readonly days: number;
}

const openSubBenefit = (subBenefit: SubBenefit): SubBenefitBalance => ({
  name: subBenefit.name,
  yearLimit: subBenefit.yearLimit,
  visitsLimit: subBenefit.visitsPerYear,
  daysLimit: subBenefit.cap?.kind === CapKind.PER_DAY ? subBenefit.cap.maxDays : null,
  used: Money.zero(),
  visitsUsed: 0,
  daysUsed: 0,
});

const openBenefit = (benefit: BenefitType): BenefitBalance => ({
  type: benefit.type,
  limitKind: benefit.limitKind,
  limit: benefit.limit,
  used: Money.zero(),
  deductible: benefit.deductible,
  deductibleUsed: Money.zero(),
  subBenefits: benefit.subBenefits.map(openSubBenefit),
});

const exceedsCount = (used: number, limit: number | null): boolean =>
  limit !== null && used > limit;

const ensureValidSubBenefit = (type: string, sub: SubBenefitBalance): void => {
  const violated =
    (sub.yearLimit !== null && sub.used.isGreaterThan(sub.yearLimit)) ||
    exceedsCount(sub.visitsUsed, sub.visitsLimit) ||
    exceedsCount(sub.daysUsed, sub.daysLimit);
  if (violated) {
    throw new InvalidValueError(`Commit exceeds a limit of ${type} / ${sub.name}`);
  }
};

const ensureWithinLimits = (benefit: BenefitBalance): void => {
  if (benefit.used.isGreaterThan(benefit.limit)) {
    throw new InvalidValueError(`Commit exceeds the ${benefit.type} limit`);
  }
  if (benefit.deductibleUsed.isGreaterThan(benefit.deductible)) {
    throw new InvalidValueError(`Commit exceeds the ${benefit.type} deductible`);
  }
  benefit.subBenefits.forEach((sub) => ensureValidSubBenefit(benefit.type, sub));
};

// Running balances for one calculation run — the only mutable state in the calculator.
export class BenefitLedger {
  private constructor(private balances: readonly BenefitBalance[]) {}

  static open(policy: Policy): BenefitLedger {
    return new BenefitLedger(policy.benefits.map(openBenefit));
  }

  remainingBenefit(type: string): Money {
    const benefit = this.benefit(type);
    return benefit.limit.subtractFloor0(benefit.used);
  }

  deductibleRemaining(type: string): Money {
    const benefit = this.benefit(type);
    return benefit.deductible.subtractFloor0(benefit.deductibleUsed);
  }

  remainingSubYear(type: string, name: string): Money | null {
    const sub = this.subBenefit(type, name);
    return sub.yearLimit ? sub.yearLimit.subtractFloor0(sub.used) : null;
  }

  remainingVisits(type: string, name: string): number | null {
    const sub = this.subBenefit(type, name);
    return sub.visitsLimit === null ? null : sub.visitsLimit - sub.visitsUsed;
  }

  remainingDays(type: string, name: string): number | null {
    const sub = this.subBenefit(type, name);
    return sub.daysLimit === null ? null : sub.daysLimit - sub.daysUsed;
  }

  commit(change: LedgerCommit): void {
    const benefit = this.benefit(change.type);
    const sub = this.subBenefit(change.type, change.subBenefit);
    const nextSub: SubBenefitBalance = {
      ...sub,
      used: sub.used.add(change.covered),
      visitsUsed: sub.visitsUsed + change.visits,
      daysUsed: sub.daysUsed + change.days,
    };
    this.replace({
      ...benefit,
      used: benefit.used.add(change.covered),
      deductibleUsed: benefit.deductibleUsed.add(change.deductible),
      subBenefits: benefit.subBenefits.map((candidate) =>
        candidate === sub ? nextSub : candidate,
      ),
    });
  }

  commitDeductibleOnly(type: string, amount: Money): void {
    const benefit = this.benefit(type);
    this.replace({ ...benefit, deductibleUsed: benefit.deductibleUsed.add(amount) });
  }

  snapshot(): readonly BenefitBalance[] {
    return this.balances;
  }

  private replace(next: BenefitBalance): void {
    ensureWithinLimits(next);
    this.balances = this.balances.map((balance) => (balance.type === next.type ? next : balance));
  }

  private benefit(type: string): BenefitBalance {
    const benefit = this.balances.find((balance) => balance.type === type);
    if (!benefit) {
      throw new InvalidValueError(`Unknown benefit type "${type}"`);
    }
    return benefit;
  }

  private subBenefit(type: string, name: string): SubBenefitBalance {
    const sub = this.benefit(type).subBenefits.find((candidate) => candidate.name === name);
    if (!sub) {
      throw new InvalidValueError(`Unknown sub-benefit "${type} / ${name}"`);
    }
    return sub;
  }
}
