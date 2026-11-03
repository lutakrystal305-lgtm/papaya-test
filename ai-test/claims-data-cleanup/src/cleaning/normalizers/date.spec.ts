import { normalizeDate } from './date';

describe('normalizeDate', () => {
  it('leaves an ISO date unchanged', () => {
    expect(normalizeDate('2024-03-15')).toEqual({ value: '2024-03-15', issues: [] });
  });

  it.each([
    ['15/03/2024', '2024-03-15'],
    ['5/3/2024', '2024-03-05'],
    ['March 15, 2024', '2024-03-15'],
    ['MARCH 5, 2024', '2024-03-05'],
    ['march 15, 2024', '2024-03-15'],
  ])('converts %p to %p with DATE_REFORMATTED', (value, expected) => {
    expect(normalizeDate(value)).toEqual({ value: expected, issues: ['DATE_REFORMATTED'] });
  });

  it('reads slash dates as day/month/year', () => {
    expect(normalizeDate('03/04/2024').value).toBe('2024-04-03');
  });

  it('accepts 29 February in a leap year', () => {
    expect(normalizeDate('2024-02-29')).toEqual({ value: '2024-02-29', issues: [] });
  });

  it.each(['2023-02-29', '31/02/2024', '2024-13-01', '00/01/2024', '2024-04-31', '1900-02-29'])(
    'marks the impossible date %p as invalid',
    (value) => {
      expect(normalizeDate(value)).toEqual({ value: 'NULL', issues: ['DATE_INVALID'] });
    },
  );

  it('accepts 29 February 2000 (divisible by 400)', () => {
    expect(normalizeDate('29/02/2000').value).toBe('2000-02-29');
  });

  it.each([
    'Mar 15, 2024',
    'Mar 15 2024',
    '2024/03/15',
    '15-03-2024',
    'yesterday',
    'Smarch 1, 2024',
  ])('marks the unsupported format %p as invalid', (value) => {
    expect(normalizeDate(value)).toEqual({ value: 'NULL', issues: ['DATE_INVALID'] });
  });
});
