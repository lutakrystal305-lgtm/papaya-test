import type {
  ClaimValues,
  CleanClaimRow,
  CleanupResult,
  IssueCode,
  RawClaimRow,
} from '../shared/types';

export const CLEAN_VALUES: ClaimValues = {
  claim_id: 'CLM-00001',
  policy_id: 'POL-101',
  member_name: 'John Doe',
  claim_type: 'OUTPATIENT',
  diagnosis: 'Flu',
  submitted_amount: '1500',
  currency: 'THB',
  submitted_date: '2024-01-10',
  status: 'APPROVED',
};

export function rawRow(sourceRow: number, overrides: Partial<ClaimValues> = {}): RawClaimRow {
  return { sourceRow, values: { ...CLEAN_VALUES, ...overrides } };
}

export function cleanClaimRow(
  sourceRow: number,
  overrides: Partial<ClaimValues> = {},
  issues: IssueCode[] = [],
  amountHundredths: number | null = 150000,
): CleanClaimRow {
  return { sourceRow, values: { ...CLEAN_VALUES, ...overrides }, issues, amountHundredths };
}

export function cleanupResult(rows: CleanClaimRow[], duplicates = 0): CleanupResult {
  return {
    rowsBefore: rows.length + duplicates,
    duplicates: Array.from({ length: duplicates }, (_, i) => ({
      sourceRow: rows.length + i + 1,
      duplicateOf: 1,
    })),
    rows,
  };
}
