import type { IssueCode } from '../constants/issue-catalogue';

export interface VariantCount {
  variant: string;
  count: number;
}

export interface IssueLogRow {
  source_row: number;
  claim_id: string;
  issues: IssueCode[];
}

export interface IssueLog {
  seed: number;
  total_rows: number;
  rows_with_issues: number;
  rows_with_multiple_issues: number;
  variant_counts: VariantCount[];
  rows: IssueLogRow[];
}
