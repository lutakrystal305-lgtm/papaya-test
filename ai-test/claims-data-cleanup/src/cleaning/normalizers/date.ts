import { NULL_MARKER } from '../../shared/constants/columns';
import { MONTHS } from '../../shared/constants/mappings';
import type { CellResult } from '../../shared/types';

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const MONTH_NAME_PATTERN = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FEBRUARY = 2;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return month === FEBRUARY && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

function isRealDate({ year, month, day }: DateParts): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function formatIsoDate({ year, month, day }: DateParts): string {
  const pad = (n: number, width: number): string => String(n).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function parseParts(value: string): DateParts | undefined {
  const iso = ISO_PATTERN.exec(value);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const slash = SLASH_PATTERN.exec(value);
  if (slash) return { year: Number(slash[3]), month: Number(slash[2]), day: Number(slash[1]) };
  const named = MONTH_NAME_PATTERN.exec(value);
  const month = named ? MONTHS[named[1].toLowerCase()] : undefined;
  if (named && month !== undefined) {
    return { year: Number(named[3]), month, day: Number(named[2]) };
  }
  return undefined;
}

/** Parses calendar dates by hand; no `Date` object, so time zones cannot shift the result. */
export function normalizeDate(value: string): CellResult {
  const parts = parseParts(value);
  if (!parts || !isRealDate(parts)) return { value: NULL_MARKER, issues: ['DATE_INVALID'] };
  const iso = formatIsoDate(parts);
  return { value: iso, issues: iso === value ? [] : ['DATE_REFORMATTED'] };
}
