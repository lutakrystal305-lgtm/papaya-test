import { stringify } from 'csv-stringify/sync';
import { CLAIM_COLUMNS, ISSUE_SEPARATOR, ISSUES_COLUMN } from '../shared/constants/columns';
import type { ClaimValues, CleanupResult } from '../shared/types';

const CLEAN_COLUMNS = [...CLAIM_COLUMNS, ISSUES_COLUMN];

function toCsv(columns: readonly string[], records: string[][]): string {
  const header = stringify([[...columns]], { record_delimiter: '\n' });
  return header + stringify(records, { record_delimiter: '\n' });
}

export function serializeCleanCsv(result: CleanupResult): string {
  const records = result.rows.map((row) => [
    ...CLAIM_COLUMNS.map((column) => row.values[column]),
    row.issues.join(ISSUE_SEPARATOR),
  ]);
  return toCsv(CLEAN_COLUMNS, records);
}

export function serializeDirtyCsv(rows: readonly ClaimValues[]): string {
  return toCsv(
    CLAIM_COLUMNS,
    rows.map((values) => CLAIM_COLUMNS.map((column) => values[column])),
  );
}
