export const CLAIM_COLUMNS = [
  'claim_id',
  'policy_id',
  'member_name',
  'claim_type',
  'diagnosis',
  'submitted_amount',
  'currency',
  'submitted_date',
  'status',
] as const;

export type ClaimColumn = (typeof CLAIM_COLUMNS)[number];

export const ISSUES_COLUMN = 'issues';
export const NULL_MARKER = 'NULL';
export const ISSUE_SEPARATOR = '|';

/** Compared after trimming and lowercasing. The literal text `NULL` is deliberately not missing (A-5). */
export const MISSING_TOKENS: readonly string[] = ['', 'n/a'];
