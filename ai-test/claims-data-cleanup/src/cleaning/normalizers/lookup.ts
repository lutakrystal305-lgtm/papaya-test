import { NULL_MARKER } from '../../shared/constants/columns';
import type { CellResult, IssueCode } from '../../shared/types';

/** Shared rule for columns with a fixed set of values: unchanged, normalized, or unrecognized. */
export function lookupResult(
  value: string,
  mapped: string | undefined,
  normalized: IssueCode,
  unrecognized: IssueCode,
): CellResult {
  if (mapped === undefined) return { value: NULL_MARKER, issues: [unrecognized] };
  return { value: mapped, issues: mapped === value ? [] : [normalized] };
}
