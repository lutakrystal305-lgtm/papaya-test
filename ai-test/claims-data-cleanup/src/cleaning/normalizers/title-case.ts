import type { CellResult, IssueCode } from '../../shared/types';

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function titleCase(value: string, code: IssueCode): CellResult {
  const fixed = value.split(' ').map(capitalize).join(' ');
  return { value: fixed, issues: fixed === value ? [] : [code] };
}
