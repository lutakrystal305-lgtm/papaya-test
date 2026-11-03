import { normalizeCurrency } from './currency';

describe('normalizeCurrency', () => {
  it.each(['THB', 'VND'])('leaves %p unchanged', (value) => {
    expect(normalizeCurrency(value)).toEqual({ value, issues: [] });
  });

  it.each([
    ['thb', 'THB'],
    ['Baht', 'THB'],
    ['฿', 'THB'],
    ['vnd', 'VND'],
    ['Dong', 'VND'],
    ['đồng', 'VND'],
  ])('maps %p to %p with CURRENCY_NORMALIZED', (value, expected) => {
    expect(normalizeCurrency(value)).toEqual({ value: expected, issues: ['CURRENCY_NORMALIZED'] });
  });

  it('marks USD as unrecognized', () => {
    expect(normalizeCurrency('USD')).toEqual({ value: 'NULL', issues: ['CURRENCY_UNRECOGNIZED'] });
  });
});
