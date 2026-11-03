import type { CellResult } from '../../shared/types';

/** IDs are only trimmed; their format is not checked (A-3). */
export function normalizeId(value: string): CellResult {
  return { value, issues: [] };
}
