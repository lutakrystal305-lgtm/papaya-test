import { MAX_PERCENTAGE } from '../calculations.constants';
import { InvalidValueError } from '../calculations.errors';
import { Money } from './money';

export type CopayKind = 'PERCENTAGE' | 'FIXED';

export class CopayRule {
  private constructor(
    readonly kind: CopayKind,
    readonly percentage: number,
    readonly maxPerVisit: Money | null,
    readonly fixedPerVisit: Money | null,
  ) {}

  static percentage(percentage: number, maxPerVisit?: Money): CopayRule {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_PERCENTAGE) {
      throw new InvalidValueError(`Copay percentage must be between 0 and 100, got ${percentage}`);
    }
    if (maxPerVisit?.isZero()) {
      throw new InvalidValueError('Copay max_per_visit must be greater than 0');
    }
    return new CopayRule('PERCENTAGE', percentage, maxPerVisit ?? null, null);
  }

  static fixed(amount: Money): CopayRule {
    if (amount.isZero()) {
      throw new InvalidValueError('Fixed copay must be greater than 0');
    }
    return new CopayRule('FIXED', 0, null, amount);
  }

  apply(amount: Money): Money {
    if (this.fixedPerVisit) {
      return Money.min(this.fixedPerVisit, amount);
    }
    const raw = amount.percentOf(this.percentage);
    return this.maxPerVisit ? Money.min(raw, this.maxPerVisit) : raw;
  }

  isCapped(amount: Money): boolean {
    return (
      this.maxPerVisit !== null && amount.percentOf(this.percentage).isGreaterThan(this.maxPerVisit)
    );
  }

  isZero(): boolean {
    return this.kind === 'PERCENTAGE' && this.percentage === 0;
  }
}
