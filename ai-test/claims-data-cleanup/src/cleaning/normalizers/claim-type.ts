import { CLAIM_TYPE_MAP } from '../../shared/constants/mappings';
import type { CellResult } from '../../shared/types';
import { lookupResult } from './lookup';

export function normalizeClaimType(value: string): CellResult {
  const key = value.toLowerCase().replace(/[^a-z]/g, '');
  return lookupResult(
    value,
    CLAIM_TYPE_MAP[key],
    'CLAIM_TYPE_NORMALIZED',
    'CLAIM_TYPE_UNRECOGNIZED',
  );
}
