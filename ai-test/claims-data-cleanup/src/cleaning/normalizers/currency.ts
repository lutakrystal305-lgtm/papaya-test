import { CURRENCY_MAP } from '../../shared/constants/mappings';
import type { CellResult } from '../../shared/types';
import { lookupResult } from './lookup';

export function normalizeCurrency(value: string): CellResult {
  return lookupResult(
    value,
    CURRENCY_MAP[value.toLowerCase()],
    'CURRENCY_NORMALIZED',
    'CURRENCY_UNRECOGNIZED',
  );
}
