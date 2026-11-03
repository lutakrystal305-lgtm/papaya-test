import { CLAIM_COLUMNS } from '../shared/constants/columns';
import type { DuplicateRef, RawClaimRow } from '../shared/types';

export interface DeduplicationResult {
  kept: RawClaimRow[];
  duplicates: DuplicateRef[];
}

/** Compares the 9 raw values exactly as read, before any cleanup (Q1). */
export function removeExactDuplicates(rows: readonly RawClaimRow[]): DeduplicationResult {
  const firstSeen = new Map<string, number>();
  const kept: RawClaimRow[] = [];
  const duplicates: DuplicateRef[] = [];
  for (const row of rows) {
    const key = JSON.stringify(CLAIM_COLUMNS.map((column) => row.values[column]));
    const original = firstSeen.get(key);
    if (original === undefined) {
      firstSeen.set(key, row.sourceRow);
      kept.push(row);
    } else {
      duplicates.push({ sourceRow: row.sourceRow, duplicateOf: original });
    }
  }
  return { kept, duplicates };
}
