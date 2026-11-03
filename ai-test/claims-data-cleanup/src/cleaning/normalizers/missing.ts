import { MISSING_TOKENS } from '../../shared/constants/columns';

export function isMissing(value: string): boolean {
  return MISSING_TOKENS.includes(value.trim().toLowerCase());
}
