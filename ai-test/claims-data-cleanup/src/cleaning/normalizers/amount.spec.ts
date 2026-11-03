import { normalizeAmount } from './amount';

describe('normalizeAmount', () => {
  it('keeps a plain positive amount', () => {
    expect(normalizeAmount('15000')).toEqual({ value: '15000', issues: [], hundredths: 1500000 });
  });

  it('removes thousand separators', () => {
    expect(normalizeAmount('15,000')).toEqual({
      value: '15000',
      issues: ['AMOUNT_REFORMATTED'],
      hundredths: 1500000,
    });
  });

  it('removes separators from a large amount with decimals', () => {
    expect(normalizeAmount('1,234,567.89')).toEqual({
      value: '1234567.89',
      issues: ['AMOUNT_REFORMATTED'],
      hundredths: 123456789,
    });
  });

  it('reads one decimal place as tenths', () => {
    expect(normalizeAmount('15000.5')).toEqual({
      value: '15000.5',
      issues: [],
      hundredths: 1500050,
    });
  });

  it.each(['0', '0.00'])('keeps zero %p as written and flags it', (value) => {
    expect(normalizeAmount(value)).toEqual({ value, issues: ['AMOUNT_ZERO'], hundredths: null });
  });

  it('keeps a negative amount and flags it', () => {
    expect(normalizeAmount('-500')).toEqual({
      value: '-500',
      issues: ['AMOUNT_NEGATIVE'],
      hundredths: null,
    });
  });

  it('flags a negative amount with separators twice', () => {
    expect(normalizeAmount('-15,000')).toEqual({
      value: '-15000',
      issues: ['AMOUNT_REFORMATTED', 'AMOUNT_NEGATIVE'],
      hundredths: null,
    });
  });

  it('treats -0 as zero, not negative', () => {
    expect(normalizeAmount('-0').issues).toEqual(['AMOUNT_ZERO']);
  });

  it.each(['abc', '1,23', '1.2.3', '15000.505', '12,34,567', '+5', '.5', '5.'])(
    'marks %p as unparseable',
    (value) => {
      expect(normalizeAmount(value)).toEqual({
        value: 'NULL',
        issues: ['AMOUNT_UNPARSEABLE'],
        hundredths: null,
      });
    },
  );

  it('keeps precision for very large amounts', () => {
    expect(normalizeAmount('25,000,000,000.99').hundredths).toBe(2500000000099);
  });
});
