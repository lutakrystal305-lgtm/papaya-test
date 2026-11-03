import type { CleanupResult, RawClaimRow } from '../shared/types';
import { flagClaimIdConflicts } from './claim-id-conflicts';
import { removeExactDuplicates } from './deduplicate';
import { cleanRow } from './row-cleaner';

export function cleanClaims(rows: readonly RawClaimRow[]): CleanupResult {
  const { kept, duplicates } = removeExactDuplicates(rows);
  return {
    rowsBefore: rows.length,
    duplicates,
    rows: flagClaimIdConflicts(kept.map(cleanRow)),
  };
}
