import type { ClaimColumn } from '../constants/columns';
import type { IssueCode } from '../constants/issue-catalogue';
import type { Currency } from '../constants/mappings';

export interface RowCounts {
  before: number;
  duplicates_removed: number;
  after: number;
}

export interface IssueCountEntry {
  code: IssueCode;
  column: ClaimColumn;
  severity: 'fixed' | 'invalid';
  rows: number;
}

export interface IssueSummary {
  by_code: IssueCountEntry[];
  rows_with_any_issue: number;
  rows_with_multiple_issues: number;
}

export interface CountEntry {
  value: string;
  count: number;
}

export interface AverageEntry {
  claim_type: string;
  currency: Currency;
  rows: number;
  average: number | null;
}

export interface DiagnosisEntry {
  diagnosis: string;
  count: number;
}

export interface DataQualityReport {
  source_file: string;
  row_counts: RowCounts;
  issues: IssueSummary;
  claims_by_type: CountEntry[];
  claims_by_status: CountEntry[];
  average_amount_by_type: AverageEntry[];
  top_diagnoses: DiagnosisEntry[];
}
