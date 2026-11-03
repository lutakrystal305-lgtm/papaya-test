import { isMissing } from './missing';

describe('isMissing', () => {
  it.each(['', 'N/A', 'n/a', ' n/A ', '   '])('treats %p as missing', (value) => {
    expect(isMissing(value)).toBe(true);
  });

  it.each(['NULL', 'NA', 'none', '0'])('does not treat %p as missing', (value) => {
    expect(isMissing(value)).toBe(false);
  });
});
