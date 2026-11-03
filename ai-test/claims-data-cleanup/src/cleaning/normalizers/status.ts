import { STATUSES } from '../../shared/constants/mappings';
import type { CellResult } from '../../shared/types';
import { lookupResult } from './lookup';

const VALID: ReadonlySet<string> = new Set(STATUSES);

export function normalizeStatus(value: string): CellResult {
  const key = value.toUpperCase().replace(/[ -]/g, '_');
  return lookupResult(
    value,
    VALID.has(key) ? key : undefined,
    'STATUS_NORMALIZED',
    'STATUS_UNRECOGNIZED',
  );
}
