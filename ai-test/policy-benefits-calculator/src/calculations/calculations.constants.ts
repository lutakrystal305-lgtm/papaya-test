export const MINOR_UNITS_PER_MAJOR = 100;
export const PERCENT_BASE = 100;
export const MAX_PERCENTAGE = 100;
export const MS_PER_DAY = 86_400_000;
export const DEFAULT_EXPENSE_DAYS = 1;
export const SIGNIFICANT_DIGITS = 15;
export const MISSING_EXPENSE_ID = '<missing>';
// Keeps every amount × days product within Number.MAX_SAFE_INTEGER minor units.
export const MAX_AMOUNT_MAJOR = 100_000_000_000;
export const MAX_EXPENSE_DAYS = 366;

export const Decision = {
  COVERED: 'COVERED',
  PARTIALLY_COVERED: 'PARTIALLY_COVERED',
  DENIED: 'DENIED',
} as const;
export type Decision = (typeof Decision)[keyof typeof Decision];

export const LimitKind = {
  ANNUAL: 'ANNUAL',
  LIFETIME: 'LIFETIME',
} as const;
export type LimitKind = (typeof LimitKind)[keyof typeof LimitKind];

export const CapKind = {
  PER_VISIT: 'PER_VISIT',
  PER_EVENT: 'PER_EVENT',
  PER_DAY: 'PER_DAY',
} as const;
export type CapKind = (typeof CapKind)[keyof typeof CapKind];
