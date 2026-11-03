import { NULL_MARKER } from '../shared/constants/columns';
import { sortIssues } from '../shared/constants/issue-catalogue';
import type { CleanClaimRow } from '../shared/types';

export function flagClaimIdConflicts(rows: readonly CleanClaimRow[]): CleanClaimRow[] {
  const counts = new Map<string, number>();
  for (const { values } of rows) {
    if (values.claim_id !== NULL_MARKER) {
      counts.set(values.claim_id, (counts.get(values.claim_id) ?? 0) + 1);
    }
  }
  return rows.map((row) =>
    (counts.get(row.values.claim_id) ?? 0) > 1
      ? { ...row, issues: sortIssues([...row.issues, 'CONFLICTING_CLAIM_ID']) }
      : row,
  );
}
