import { InvalidValueError } from '../calculations.errors';
import { CopayRule } from './copay-rule';
import { Money } from './money';

const thb = (major: number): Money => Money.fromMajor(major);

describe('CopayRule', () => {
  describe('percentage with a per-visit cap', () => {
    const rule = CopayRule.percentage(20, thb(500));

    it('applies the percentage below the cap', () => {
      expect(rule.apply(thb(2500)).toMajor()).toBe(500);
      expect(rule.apply(thb(1500)).toMajor()).toBe(300);
    });

    it('caps the copay', () => {
      expect(rule.apply(thb(3000)).toMajor()).toBe(500);
      expect(rule.isCapped(thb(3000))).toBe(true);
      expect(rule.isCapped(thb(1500))).toBe(false);
    });
  });

  it('applies a percentage without a cap', () => {
    const rule = CopayRule.percentage(30);
    expect(rule.apply(thb(3000)).toMajor()).toBe(900);
    expect(rule.isCapped(thb(3000))).toBe(false);
  });

  it('treats 0% as no copay', () => {
    const rule = CopayRule.percentage(0);
    expect(rule.apply(thb(40000)).isZero()).toBe(true);
    expect(rule.isZero()).toBe(true);
  });

  it('applies a fixed copay up to the amount', () => {
    const rule = CopayRule.fixed(thb(200));
    expect(rule.apply(thb(1500)).toMajor()).toBe(200);
    expect(rule.apply(thb(150)).toMajor()).toBe(150);
    expect(rule.isZero()).toBe(false);
    expect(rule.isCapped(thb(1500))).toBe(false);
  });

  it.each([-1, 101, Number.NaN])('rejects percentage %p', (pct) => {
    expect(() => CopayRule.percentage(pct)).toThrow(InvalidValueError);
  });

  it('rejects a zero per-visit cap', () => {
    expect(() => CopayRule.percentage(20, Money.zero())).toThrow(InvalidValueError);
  });

  it('rejects a zero fixed copay', () => {
    expect(() => CopayRule.fixed(Money.zero())).toThrow(InvalidValueError);
  });
});
