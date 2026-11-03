import { InvalidValueError } from '../calculations.errors';
import { IsoDate } from './iso-date';

describe('IsoDate', () => {
  it('accepts a leap day', () => {
    expect(IsoDate.parse('2024-02-29').toString()).toBe('2024-02-29');
  });

  it.each(['2024-02-30', '2023-02-29', '24-01-01', '2024-1-1', '2024-13-01', ''])(
    'rejects %p',
    (value) => {
      expect(() => IsoDate.parse(value)).toThrow(InvalidValueError);
    },
  );

  it('reports validity without throwing', () => {
    expect(IsoDate.isValid('2024-01-01')).toBe(true);
    expect(IsoDate.isValid('2024-02-30')).toBe(false);
    expect(IsoDate.isValid(20240101)).toBe(false);
  });

  it('adds days across months in a leap year', () => {
    const start = IsoDate.parse('2024-01-01');
    expect(start.addDays(90).toString()).toBe('2024-03-31');
    expect(start.addDays(270).toString()).toBe('2024-09-27');
  });

  it('counts days until another date', () => {
    expect(IsoDate.parse('2024-02-10').daysUntil(IsoDate.parse('2024-03-31'))).toBe(50);
  });

  it('compares dates', () => {
    const early = IsoDate.parse('2024-01-01');
    const late = IsoDate.parse('2024-01-02');
    expect(early.compare(late)).toBeLessThan(0);
    expect(late.compare(early)).toBeGreaterThan(0);
    expect(early.compare(IsoDate.parse('2024-01-01'))).toBe(0);
    expect(early.isBefore(late)).toBe(true);
    expect(late.isAfter(early)).toBe(true);
    expect(late.isOnOrAfter(late)).toBe(true);
    expect(early.isOnOrAfter(late)).toBe(false);
  });
});
