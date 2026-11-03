import { NULL_MARKER } from '../shared/constants/columns';
import type { ClaimColumn } from '../shared/constants/columns';
import { ISSUE_CATALOGUE } from '../shared/constants/issue-catalogue';
import { CLAIM_TYPES, CURRENCIES, STATUSES } from '../shared/constants/mappings';
import type {
  AverageEntry,
  CleanClaimRow,
  CleanupResult,
  CountEntry,
  DataQualityReport,
  DiagnosisEntry,
  IssueCountEntry,
  IssueSummary,
} from '../shared/types';
import { averageHundredths, hundredthsToNumber } from './amount-math';

export const TOP_DIAGNOSES_LIMIT = 5;

function countIssues(rows: readonly CleanClaimRow[]): IssueSummary {
  const by_code = ISSUE_CATALOGUE.filter((entry) => entry.severity !== 'removed').map(
    (entry): IssueCountEntry => ({
      code: entry.code,
      column: entry.column,
      severity: entry.severity,
      rows: rows.filter((row) => row.issues.includes(entry.code)).length,
    }),
  );
  return {
    by_code,
    rows_with_any_issue: rows.filter((row) => row.issues.length > 0).length,
    rows_with_multiple_issues: rows.filter((row) => row.issues.length > 1).length,
  };
}

/** Counts every known value (zeros included), then NULL only when it occurs. */
function countBy(
  rows: readonly CleanClaimRow[],
  column: ClaimColumn,
  known: readonly string[],
): CountEntry[] {
  const count = (value: string): number => rows.filter((r) => r.values[column] === value).length;
  const entries = known.map((value) => ({ value, count: count(value) }));
  const nulls = count(NULL_MARKER);
  return nulls > 0 ? [...entries, { value: NULL_MARKER, count: nulls }] : entries;
}

function averagesByTypeAndCurrency(
  rows: readonly CleanClaimRow[],
  claimTypes: readonly string[],
): AverageEntry[] {
  return claimTypes.flatMap((claim_type) =>
    CURRENCIES.map((currency): AverageEntry => {
      const amounts = rows
        .filter((r) => r.values.claim_type === claim_type && r.values.currency === currency)
        .flatMap((r) => (r.amountHundredths === null ? [] : [r.amountHundredths]));
      const average = averageHundredths(amounts);
      return {
        claim_type,
        currency,
        rows: amounts.length,
        average: average === null ? null : hundredthsToNumber(average),
      };
    }),
  );
}

function compareDiagnoses(a: DiagnosisEntry, b: DiagnosisEntry): number {
  if (a.count !== b.count) return b.count - a.count;
  if (a.diagnosis === b.diagnosis) return 0;
  return a.diagnosis < b.diagnosis ? -1 : 1;
}

function topDiagnoses(rows: readonly CleanClaimRow[]): DiagnosisEntry[] {
  const groups = new Map<string, DiagnosisEntry>();
  for (const { values } of rows) {
    if (values.diagnosis === NULL_MARKER) continue;
    const key = values.diagnosis.toLowerCase();
    const entry = groups.get(key) ?? { diagnosis: values.diagnosis, count: 0 };
    groups.set(key, { ...entry, count: entry.count + 1 });
  }
  return [...groups.values()].sort(compareDiagnoses).slice(0, TOP_DIAGNOSES_LIMIT);
}

function fileName(source: string): string {
  return source.replace(/^.*[\\/]/, '');
}

export function buildReport(result: CleanupResult, sourceFile: string): DataQualityReport {
  const { rows } = result;
  const claimsByType = countBy(rows, 'claim_type', CLAIM_TYPES);
  return {
    source_file: fileName(sourceFile),
    row_counts: {
      before: result.rowsBefore,
      duplicates_removed: result.duplicates.length,
      after: rows.length,
    },
    issues: countIssues(rows),
    claims_by_type: claimsByType,
    claims_by_status: countBy(rows, 'status', STATUSES),
    average_amount_by_type: averagesByTypeAndCurrency(
      rows,
      claimsByType.map((entry) => entry.value),
    ),
    top_diagnoses: topDiagnoses(rows),
  };
}
