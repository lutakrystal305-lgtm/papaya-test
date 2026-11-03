import type { ClaimColumn } from '../constants/columns';
import type { IssueCode } from '../constants/issue-catalogue';

export type { ClaimColumn } from '../constants/columns';
export type { IssueCode, IssueSeverity } from '../constants/issue-catalogue';

export type ClaimValues = Record<ClaimColumn, string>;

export interface RawClaimRow {
  /** 1-based data row number in the input (header not counted). */
  sourceRow: number;
  values: ClaimValues;
}

export interface CellResult {
  value: string;
  issues: IssueCode[];
}

export interface CleanClaimRow extends RawClaimRow {
  issues: IssueCode[];
  /** Set only for a valid, positive amount. */
  amountHundredths: number | null;
}

export interface DuplicateRef {
  sourceRow: number;
  duplicateOf: number;
}

export interface CleanupResult {
  rowsBefore: number;
  duplicates: DuplicateRef[];
  rows: CleanClaimRow[];
}
