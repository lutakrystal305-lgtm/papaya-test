import type { ClaimColumn } from './columns';

export type IssueSeverity = 'fixed' | 'invalid' | 'removed';

export const ISSUE_CATALOGUE = [
  { code: 'DUPLICATE_ROW', column: 'row', severity: 'removed' },
  { code: 'CONFLICTING_CLAIM_ID', column: 'claim_id', severity: 'invalid' },
  { code: 'MISSING_CLAIM_ID', column: 'claim_id', severity: 'invalid' },
  { code: 'MISSING_POLICY_ID', column: 'policy_id', severity: 'invalid' },
  { code: 'MISSING_MEMBER_NAME', column: 'member_name', severity: 'invalid' },
  { code: 'NAME_CASING_FIXED', column: 'member_name', severity: 'fixed' },
  { code: 'MISSING_CLAIM_TYPE', column: 'claim_type', severity: 'invalid' },
  { code: 'CLAIM_TYPE_NORMALIZED', column: 'claim_type', severity: 'fixed' },
  { code: 'CLAIM_TYPE_UNRECOGNIZED', column: 'claim_type', severity: 'invalid' },
  { code: 'MISSING_DIAGNOSIS', column: 'diagnosis', severity: 'invalid' },
  { code: 'DIAGNOSIS_CASING_FIXED', column: 'diagnosis', severity: 'fixed' },
  { code: 'MISSING_AMOUNT', column: 'submitted_amount', severity: 'invalid' },
  { code: 'AMOUNT_REFORMATTED', column: 'submitted_amount', severity: 'fixed' },
  { code: 'AMOUNT_ZERO', column: 'submitted_amount', severity: 'invalid' },
  { code: 'AMOUNT_NEGATIVE', column: 'submitted_amount', severity: 'invalid' },
  { code: 'AMOUNT_UNPARSEABLE', column: 'submitted_amount', severity: 'invalid' },
  { code: 'MISSING_CURRENCY', column: 'currency', severity: 'invalid' },
  { code: 'CURRENCY_NORMALIZED', column: 'currency', severity: 'fixed' },
  { code: 'CURRENCY_UNRECOGNIZED', column: 'currency', severity: 'invalid' },
  { code: 'MISSING_DATE', column: 'submitted_date', severity: 'invalid' },
  { code: 'DATE_REFORMATTED', column: 'submitted_date', severity: 'fixed' },
  { code: 'DATE_INVALID', column: 'submitted_date', severity: 'invalid' },
  { code: 'MISSING_STATUS', column: 'status', severity: 'invalid' },
  { code: 'STATUS_NORMALIZED', column: 'status', severity: 'fixed' },
  { code: 'STATUS_UNRECOGNIZED', column: 'status', severity: 'invalid' },
] as const satisfies readonly {
  code: string;
  column: ClaimColumn | 'row';
  severity: IssueSeverity;
}[];

export type IssueCode = (typeof ISSUE_CATALOGUE)[number]['code'];
export type IssueCatalogueEntry = (typeof ISSUE_CATALOGUE)[number];

const RANK = new Map<IssueCode, number>(ISSUE_CATALOGUE.map((entry, index) => [entry.code, index]));

export function issueRank(code: IssueCode): number {
  return RANK.get(code) ?? Number.MAX_SAFE_INTEGER;
}

export function sortIssues(codes: Iterable<IssueCode>): IssueCode[] {
  return [...new Set(codes)].sort((a, b) => issueRank(a) - issueRank(b));
}

export const MISSING_CODE_BY_COLUMN: Readonly<Record<ClaimColumn, IssueCode>> = {
  claim_id: 'MISSING_CLAIM_ID',
  policy_id: 'MISSING_POLICY_ID',
  member_name: 'MISSING_MEMBER_NAME',
  claim_type: 'MISSING_CLAIM_TYPE',
  diagnosis: 'MISSING_DIAGNOSIS',
  submitted_amount: 'MISSING_AMOUNT',
  currency: 'MISSING_CURRENCY',
  submitted_date: 'MISSING_DATE',
  status: 'MISSING_STATUS',
};
