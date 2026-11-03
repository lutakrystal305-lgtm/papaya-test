import type { AverageEntry, CountEntry, DataQualityReport } from '../shared/types';
import { formatAmount } from './amount-math';

const NO_VALUE = '—';
const HUNDREDTHS_PER_UNIT = 100;

function table(headers: readonly string[], rows: readonly (string | number)[][]): string[] {
  const line = (cells: readonly (string | number)[]): string => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)];
}

function section(title: string, body: readonly string[]): string[] {
  return [`## ${title}`, '', ...body, ''];
}

function rowCounts(report: DataQualityReport): string[] {
  const { before, duplicates_removed, after } = report.row_counts;
  return section(
    'Row counts',
    table(
      ['Metric', 'Rows'],
      [
        ['Rows before cleaning', before],
        ['Duplicates removed', duplicates_removed],
        ['Rows after cleaning', after],
      ],
    ),
  );
}

function issues(report: DataQualityReport): string[] {
  const { by_code, rows_with_any_issue, rows_with_multiple_issues } = report.issues;
  const rows = by_code.map((e) => [`\`${e.code}\``, e.column, e.severity, e.rows]);
  return section('Issues found', [
    ...table(['Code', 'Column', 'Severity', 'Rows'], rows),
    '',
    `- Rows with at least one issue: **${rows_with_any_issue}**`,
    `- Rows with more than one issue: **${rows_with_multiple_issues}**`,
  ]);
}

function counts(title: string, label: string, entries: readonly CountEntry[]): string[] {
  return section(
    title,
    table(
      [label, 'Claims'],
      entries.map((e) => [e.value, e.count]),
    ),
  );
}

function formatAverage(average: number | null): string {
  return average === null ? NO_VALUE : formatAmount(Math.round(average * HUNDREDTHS_PER_UNIT));
}

function averages(entries: readonly AverageEntry[]): string[] {
  const rows = entries.map((e) => [e.claim_type, e.currency, e.rows, formatAverage(e.average)]);
  return section(
    'Average amount by claim type',
    table(['Claim type', 'Currency', 'Rows', 'Average'], rows),
  );
}

function diagnoses(report: DataQualityReport): string[] {
  if (report.top_diagnoses.length === 0) {
    return section('Top 5 diagnoses', ['_No diagnoses recorded._']);
  }
  const rows = report.top_diagnoses.map((e, index) => [index + 1, e.diagnosis, e.count]);
  return section('Top 5 diagnoses', table(['Rank', 'Diagnosis', 'Claims'], rows));
}

export function renderReportMarkdown(report: DataQualityReport): string {
  const lines = [
    '# Data Quality Report',
    '',
    `Source: \`${report.source_file}\``,
    '',
    ...rowCounts(report),
    ...issues(report),
    ...counts('Claims by type', 'Claim type', report.claims_by_type),
    ...counts('Claims by status', 'Status', report.claims_by_status),
    ...averages(report.average_amount_by_type),
    ...diagnoses(report),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}
