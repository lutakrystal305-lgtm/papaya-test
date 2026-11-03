import { CLAIM_COLUMNS, NULL_MARKER } from '../shared/constants/columns';
import type { ClaimColumn } from '../shared/constants/columns';
import { MISSING_CODE_BY_COLUMN, sortIssues } from '../shared/constants/issue-catalogue';
import type {
  CellResult,
  ClaimValues,
  CleanClaimRow,
  IssueCode,
  RawClaimRow,
} from '../shared/types';
import { normalizeAmount } from './normalizers/amount';
import { normalizeClaimType } from './normalizers/claim-type';
import { normalizeCurrency } from './normalizers/currency';
import { normalizeDate } from './normalizers/date';
import { normalizeId } from './normalizers/id';
import { isMissing } from './normalizers/missing';
import { normalizeStatus } from './normalizers/status';
import { normalizeWhitespace } from './normalizers/text';
import { titleCase } from './normalizers/title-case';

const NORMALIZERS: Readonly<Record<ClaimColumn, (value: string) => CellResult>> = {
  claim_id: normalizeId,
  policy_id: normalizeId,
  member_name: (value) => titleCase(value, 'NAME_CASING_FIXED'),
  claim_type: normalizeClaimType,
  diagnosis: (value) => titleCase(value, 'DIAGNOSIS_CASING_FIXED'),
  submitted_amount: normalizeAmount,
  currency: normalizeCurrency,
  submitted_date: normalizeDate,
  status: normalizeStatus,
};

export function cleanCell(column: ClaimColumn, raw: string): CellResult {
  const value = normalizeWhitespace(raw);
  if (isMissing(value)) return { value: NULL_MARKER, issues: [MISSING_CODE_BY_COLUMN[column]] };
  return NORMALIZERS[column](value);
}

function cleanAmountHundredths(raw: string): number | null {
  const value = normalizeWhitespace(raw);
  return isMissing(value) ? null : normalizeAmount(value).hundredths;
}

export function cleanRow(raw: RawClaimRow): CleanClaimRow {
  const values = {} as ClaimValues;
  const issues: IssueCode[] = [];
  for (const column of CLAIM_COLUMNS) {
    const cell = cleanCell(column, raw.values[column]);
    values[column] = cell.value;
    issues.push(...cell.issues);
  }
  return {
    sourceRow: raw.sourceRow,
    values,
    issues: sortIssues(issues),
    amountHundredths: cleanAmountHundredths(raw.values.submitted_amount),
  };
}
