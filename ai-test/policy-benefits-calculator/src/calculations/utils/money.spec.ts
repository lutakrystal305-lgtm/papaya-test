import { MAX_AMOUNT_MAJOR } from '../calculations.constants';
import { InvalidValueError } from '../calculations.errors';
import { Money } from './money';

describe('Money', () => {
  describe('fromMajor', () => {
    it('stores amounts as integer minor units', () => {
      expect(Money.fromMajor(2500).minor).toBe(250000);
    });

    it('rounds half-up to 2 decimals', () => {
      expect(Money.fromMajor(2500.005).minor).toBe(250001);
      expect(Money.fromMajor(0.004).minor).toBe(0);
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %p', (value) => {
      expect(() => Money.fromMajor(value)).toThrow(InvalidValueError);
    });

    it('rejects amounts above the supported maximum', () => {
      expect(Money.fromMajor(MAX_AMOUNT_MAJOR).toMajor()).toBe(MAX_AMOUNT_MAJOR);
      expect(() => Money.fromMajor(MAX_AMOUNT_MAJOR + 1)).toThrow(InvalidValueError);
    });
  });

  describe('fromMinor', () => {
    it.each([-1, 1.5, Number.NaN])('rejects %p', (value) => {
      expect(() => Money.fromMinor(value)).toThrow(InvalidValueError);
    });

    it('accepts zero', () => {
      expect(Money.fromMinor(0).isZero()).toBe(true);
    });
  });

  describe('arithmetic', () => {
    const a = Money.fromMajor(300);
    const b = Money.fromMajor(200);

    it('adds', () => {
      expect(a.add(b).toMajor()).toBe(500);
    });

    it('subtracts without going below zero', () => {
      expect(a.subtractFloor0(b).toMajor()).toBe(100);
      expect(b.subtractFloor0(a).isZero()).toBe(true);
    });

    it('returns the smaller of two amounts', () => {
      expect(Money.min(a, b).equals(b)).toBe(true);
      expect(Money.min(b, a).equals(b)).toBe(true);
    });

    it('compares amounts', () => {
      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
      expect(a.equals(Money.fromMajor(300))).toBe(true);
    });

    it('multiplies by a whole count', () => {
      expect(Money.fromMajor(4000).times(5).toMajor()).toBe(20000);
    });

    it('takes a percentage rounded half-up', () => {
      expect(Money.fromMajor(2500).percentOf(20).toMajor()).toBe(500);
      expect(Money.fromMinor(5).percentOf(50).minor).toBe(3);
    });

    it('sums a list', () => {
      expect(Money.sum([a, b, Money.zero()]).toMajor()).toBe(500);
    });
  });

  describe('format', () => {
    it('formats whole amounts with thousand separators', () => {
      expect(Money.fromMajor(2500).format('THB')).toBe('2,500 THB');
    });

    it('formats fractional amounts with 2 decimals', () => {
      expect(Money.fromMajor(2500.5).format('THB')).toBe('2,500.50 THB');
    });
  });

  it('converts back to major units with at most 2 decimals', () => {
    expect(Money.fromMajor(1234.56).toMajor()).toBe(1234.56);
  });
});
