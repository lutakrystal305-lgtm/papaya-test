import { parse } from 'csv-parse/sync';
import { generateClaims } from '../src/generator/generator';
import { runCleanup } from '../src/run-cleanup';
import { readFixture } from './helpers/fixtures';

type Row = Record<string, string>;

const FORMATS: Record<string, (v: string) => boolean> = {
  claim_id: (v) => v.length > 0 && v === v.trim(),
  policy_id: (v) => v.length > 0 && v === v.trim(),
  member_name: (v) => v.split(' ').every((w) => /^\p{Lu}[^\s\p{Lu}]*$/u.test(w)),
  claim_type: (v) => ['OUTPATIENT', 'INPATIENT', 'DENTAL', 'MATERNITY'].includes(v),
  diagnosis: (v) => v.split(' ').every((w) => /^\p{Lu}[^\s\p{Lu}]*$/u.test(w)),
  submitted_amount: (v) => /^-?\d+(\.\d{1,2})?$/.test(v),
  currency: (v) => ['THB', 'VND'].includes(v),
  submitted_date: (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
  status: (v) => ['APPROVED', 'REJECTED', 'PENDING', 'IN_REVIEW'].includes(v),
};

const INVALID_AMOUNT = ['MISSING_AMOUNT', 'AMOUNT_ZERO', 'AMOUNT_NEGATIVE', 'AMOUNT_UNPARSEABLE'];

function hundredths(amount: string): number {
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function tally(rows: Row[], column: string): Map<string, number> {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r[column], (counts.get(r[column]) ?? 0) + 1));
  return counts;
}

/** Recomputes the report from the clean CSV text alone, without the library. */
function recount(cleanCsv: string, dirtyRows: number) {
  const rows = parse<Row>(cleanCsv, { columns: true });
  const codes = rows.flatMap((r) => (r.issues ? r.issues.split('|') : []));
  const valid = rows.filter(
    (r) => r.currency !== 'NULL' && !r.issues.split('|').some((c) => INVALID_AMOUNT.includes(c)),
  );
  const averages = new Map<string, { rows: number; average: number | null }>();
  for (const type of new Set(rows.map((r) => r.claim_type))) {
    for (const currency of ['THB', 'VND']) {
      const amounts = valid.filter((r) => r.claim_type === type && r.currency === currency);
      const sum = amounts.reduce((s, r) => s + hundredths(r.submitted_amount), 0);
      const n = amounts.length;
      averages.set(`${type}/${currency}`, {
        rows: n,
        average: n ? Math.floor((2 * sum + n) / (2 * n)) / 100 : null,
      });
    }
  }
  const diagnoses = [
    ...tally(
      rows.filter((r) => r.diagnosis !== 'NULL'),
      'diagnosis',
    ),
  ]
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
    .slice(0, 5)
    .map(([diagnosis, count]) => ({ diagnosis, count }));
  return {
    rowCounts: {
      before: dirtyRows,
      duplicates_removed: dirtyRows - rows.length,
      after: rows.length,
    },
    codes: tally(
      codes.map((code) => ({ code })),
      'code',
    ),
    anyIssue: rows.filter((r) => r.issues !== '').length,
    multiple: rows.filter((r) => r.issues.includes('|')).length,
    types: tally(rows, 'claim_type'),
    statuses: tally(rows, 'status'),
    averages,
    diagnoses,
  };
}

const CASES: [string, () => string][] = [
  ['generated seed 42', () => generateClaims({ seed: 42 }).csv],
  ['hand-written fixture', () => readFixture('all-issues.dirty.csv')],
];

describe.each(CASES)('%s', (_name, load) => {
  const dirty = load();
  const { cleanCsv, report } = runCleanup(dirty, 'input.csv');
  const cleanRows = parse<Row>(cleanCsv, { columns: true });
  const expected = recount(cleanCsv, parse(dirty).length - 1);

  it('uses one allowed format per column (SC-002)', () => {
    const violations = cleanRows.flatMap((row) =>
      Object.entries(FORMATS)
        .filter(([column, ok]) => row[column] !== 'NULL' && !ok(row[column]))
        .map(([column]) => `${row.claim_id}.${column}=${row[column]}`),
    );
    expect(violations).toEqual([]);
  });

  it('matches the recount: rows (SC-003)', () => {
    expect(report.row_counts).toEqual(expected.rowCounts);
    expect(report.issues.rows_with_any_issue).toBe(expected.anyIssue);
    expect(report.issues.rows_with_multiple_issues).toBe(expected.multiple);
  });

  it('matches the recount: issue codes', () => {
    for (const entry of report.issues.by_code)
      expect(entry.rows).toBe(expected.codes.get(entry.code) ?? 0);
  });

  it('matches the recount: claims by type and status', () => {
    for (const e of report.claims_by_type) expect(e.count).toBe(expected.types.get(e.value) ?? 0);
    for (const e of report.claims_by_status)
      expect(e.count).toBe(expected.statuses.get(e.value) ?? 0);
  });

  it('matches the recount: averages and top diagnoses', () => {
    for (const e of report.average_amount_by_type) {
      expect({ rows: e.rows, average: e.average }).toEqual(
        expected.averages.get(`${e.claim_type}/${e.currency}`) ?? { rows: 0, average: null },
      );
    }
    expect(report.top_diagnoses).toEqual(expected.diagnoses);
  });
});

describe('seed 42 row counts', () => {
  it('has 500 before, 8 duplicates removed, 492 after', () => {
    const { report } = runCleanup(generateClaims({ seed: 42 }).csv, 'claims_dirty.csv');
    expect(report.row_counts).toEqual({ before: 500, duplicates_removed: 8, after: 492 });
  });
});
