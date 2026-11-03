import { parse } from 'csv-parse/sync';
import { CLAIM_COLUMNS } from '../shared/constants/columns';
import type { ClaimColumn } from '../shared/constants/columns';
import { InputFormatError } from '../shared/errors';
import type { ClaimValues, RawClaimRow } from '../shared/types';

const COLUMN_SET: ReadonlySet<string> = new Set(CLAIM_COLUMNS);

function parseRecords(text: string): string[][] {
  try {
    return parse(text, { bom: true, skip_empty_lines: true, relax_column_count: true });
  } catch (error) {
    throw new InputFormatError([`could not parse CSV: ${(error as Error).message}`]);
  }
}

function headerProblems(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  names.forEach((name) => (seen.has(name) ? repeated.add(name) : seen.add(name)));
  const missing = CLAIM_COLUMNS.filter((column) => !seen.has(column));
  const extra = [...seen].filter((name) => !COLUMN_SET.has(name));
  const problems: string[] = [];
  if (missing.length > 0) problems.push(`missing columns: ${missing.join(', ')}`);
  if (extra.length > 0) problems.push(`unexpected columns: ${extra.join(', ')}`);
  if (repeated.size > 0) problems.push(`repeated columns: ${[...repeated].join(', ')}`);
  return problems;
}

function widthProblems(records: readonly string[][], width: number): string[] {
  return records.flatMap((record, index) =>
    record.length === width
      ? []
      : [`row ${index + 1} has ${record.length} values, expected ${width}`],
  );
}

function toRow(
  record: readonly string[],
  header: readonly ClaimColumn[],
  index: number,
): RawClaimRow {
  const byName = new Map(header.map((name, i) => [name, record[i]]));
  const values = Object.fromEntries(
    CLAIM_COLUMNS.map((column) => [column, byName.get(column) ?? '']),
  ) as ClaimValues;
  return { sourceRow: index + 1, values };
}

/** Reads the raw rows without trimming values; throws InputFormatError for a bad header or row width. */
export function parseClaimsCsv(text: string): RawClaimRow[] {
  const [headerRecord, ...records] = parseRecords(text);
  if (headerRecord === undefined) return [];
  const header = headerRecord.map((name) => name.trim().toLowerCase());
  const problems = headerProblems(header);
  if (problems.length > 0) throw new InputFormatError(problems);
  const widths = widthProblems(records, header.length);
  if (widths.length > 0) throw new InputFormatError(widths);
  return records.map((record, index) => toRow(record, header as ClaimColumn[], index));
}
