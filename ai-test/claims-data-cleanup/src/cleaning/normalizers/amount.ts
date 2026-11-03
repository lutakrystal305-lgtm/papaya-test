import { NULL_MARKER } from '../../shared/constants/columns';
import type { CellResult, IssueCode } from '../../shared/types';

export interface AmountResult extends CellResult {
  /** Whole hundredths, set only for a valid positive amount. */
  hundredths: number | null;
}

const AMOUNT_PATTERN = /^(-?)(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/;
const HUNDREDTHS_PER_UNIT = 100;

/** Exact conversion from text, so no floating-point rounding is involved. */
function toHundredths(integerPart: string, fraction: string): number {
  return Number(integerPart) * HUNDREDTHS_PER_UNIT + Number(fraction.padEnd(2, '0'));
}

export function normalizeAmount(value: string): AmountResult {
  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return { value: NULL_MARKER, issues: ['AMOUNT_UNPARSEABLE'], hundredths: null };
  const [, sign, digits, fraction = ''] = match;
  const issues: IssueCode[] = digits.includes(',') ? ['AMOUNT_REFORMATTED'] : [];
  const magnitude = toHundredths(digits.replace(/,/g, ''), fraction);
  if (magnitude === 0) issues.push('AMOUNT_ZERO');
  else if (sign === '-') issues.push('AMOUNT_NEGATIVE');
  const valid = magnitude > 0 && sign === '';
  return { value: value.replace(/,/g, ''), issues, hundredths: valid ? magnitude : null };
}
