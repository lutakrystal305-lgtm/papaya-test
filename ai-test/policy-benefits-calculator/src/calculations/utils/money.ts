import {
  MAX_AMOUNT_MAJOR,
  MINOR_UNITS_PER_MAJOR,
  PERCENT_BASE,
  SIGNIFICANT_DIGITS,
} from '../calculations.constants';
import { InvalidValueError } from '../calculations.errors';

const FRACTION_DIGITS = 2;

// toPrecision removes binary noise (2500.005 * 100 = 250000.49999…) before half-up rounding.
const roundHalfUp = (value: number): number =>
  Math.round(Number(value.toPrecision(SIGNIFICANT_DIGITS)));

const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fractionFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: FRACTION_DIGITS,
  maximumFractionDigits: FRACTION_DIGITS,
});

export class Money {
  private constructor(readonly minor: number) {}

  static fromMinor(minor: number): Money {
    if (!Number.isSafeInteger(minor) || minor < 0) {
      throw new InvalidValueError(
        `Money must be a non-negative whole number of minor units, got ${minor}`,
      );
    }
    return new Money(minor);
  }

  static fromMajor(major: number): Money {
    if (!Number.isFinite(major) || major < 0) {
      throw new InvalidValueError(`Money must be a non-negative finite amount, got ${major}`);
    }
    if (major > MAX_AMOUNT_MAJOR) {
      throw new InvalidValueError(`Money must not exceed ${MAX_AMOUNT_MAJOR}, got ${major}`);
    }
    return Money.fromMinor(roundHalfUp(major * MINOR_UNITS_PER_MAJOR));
  }

  static zero(): Money {
    return new Money(0);
  }

  static min(a: Money, b: Money): Money {
    return a.minor <= b.minor ? a : b;
  }

  static sum(amounts: readonly Money[]): Money {
    return amounts.reduce((total, amount) => total.add(amount), Money.zero());
  }

  add(other: Money): Money {
    return new Money(this.minor + other.minor);
  }

  subtractFloor0(other: Money): Money {
    return new Money(Math.max(0, this.minor - other.minor));
  }

  times(count: number): Money {
    return Money.fromMinor(this.minor * count);
  }

  percentOf(percentage: number): Money {
    return Money.fromMinor(roundHalfUp((this.minor * percentage) / PERCENT_BASE));
  }

  isZero(): boolean {
    return this.minor === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.minor > other.minor;
  }

  equals(other: Money): boolean {
    return this.minor === other.minor;
  }

  toMajor(): number {
    return this.minor / MINOR_UNITS_PER_MAJOR;
  }

  format(currency: string): string {
    const isWhole = this.minor % MINOR_UNITS_PER_MAJOR === 0;
    const formatter = isWhole ? wholeFormatter : fractionFormatter;
    return `${formatter.format(this.toMajor())} ${currency}`;
  }
}
