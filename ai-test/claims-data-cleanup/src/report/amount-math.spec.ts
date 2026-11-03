import { averageHundredths, formatAmount, hundredthsToNumber } from './amount-math';

describe('averageHundredths', () => {
  it('rounds half up', () => {
    expect(averageHundredths([100, 101])).toBe(101);
  });

  it('rounds down below one half', () => {
    expect(averageHundredths([100, 100, 101])).toBe(100);
  });

  it('returns null for no values', () => {
    expect(averageHundredths([])).toBeNull();
  });

  it('keeps precision for sums near 2.5e12', () => {
    expect(averageHundredths(Array.from({ length: 500 }, () => 5_000_000_000))).toBe(5_000_000_000);
  });
});

describe('hundredthsToNumber', () => {
  it('converts hundredths to a number with at most 2 decimals', () => {
    expect(hundredthsToNumber(1500050)).toBe(15000.5);
    expect(hundredthsToNumber(264211)).toBe(2642.11);
  });
});

describe('formatAmount', () => {
  it('uses thousand separators and 2 decimals', () => {
    expect(formatAmount(123456750)).toBe('1,234,567.50');
  });

  it('formats whole amounts with .00', () => {
    expect(formatAmount(4500000)).toBe('45,000.00');
  });
});
