import { ISSUE_CATALOGUE } from '../shared/constants/issue-catalogue';
import { cleanClaimRow as row, cleanupResult } from '../testing/claim-rows';
import { buildReport } from './report-builder';

const build = (...args: Parameters<typeof cleanupResult>) =>
  buildReport(cleanupResult(...args), 'in.csv');

describe('buildReport', () => {
  it('reports before - duplicates_removed = after', () => {
    expect(build([row(1), row(2)], 3).row_counts).toEqual({
      before: 5,
      duplicates_removed: 3,
      after: 2,
    });
  });

  it('lists the 24 kept-row codes in catalogue order, zeros included, without DUPLICATE_ROW', () => {
    const byCode = build([row(1)]).issues.by_code;
    expect(byCode.map((e) => e.code)).toEqual(ISSUE_CATALOGUE.slice(1).map((e) => e.code));
    expect(byCode.every((e) => e.rows === 0)).toBe(true);
  });

  it('counts a row once under each of its codes', () => {
    const report = build([row(1, {}, ['NAME_CASING_FIXED', 'AMOUNT_ZERO', 'DATE_INVALID'], null)]);
    const counts = Object.fromEntries(report.issues.by_code.map((e) => [e.code, e.rows]));
    expect(counts).toMatchObject({ NAME_CASING_FIXED: 1, AMOUNT_ZERO: 1, DATE_INVALID: 1 });
  });

  it('counts rows with any and with multiple issues', () => {
    const report = build([
      row(1),
      row(2, {}, ['AMOUNT_ZERO']),
      row(3, {}, ['AMOUNT_ZERO', 'DATE_INVALID']),
    ]);
    expect(report.issues.rows_with_any_issue).toBe(2);
    expect(report.issues.rows_with_multiple_issues).toBe(1);
  });

  it('always lists the 4 claim types, then NULL only when it occurs', () => {
    expect(build([row(1)]).claims_by_type.map((e) => e.value)).toEqual([
      'OUTPATIENT',
      'INPATIENT',
      'DENTAL',
      'MATERNITY',
    ]);
    expect(build([row(1, { claim_type: 'NULL' })]).claims_by_type.at(-1)).toEqual({
      value: 'NULL',
      count: 1,
    });
  });

  it('always lists the 4 statuses, then NULL only when it occurs', () => {
    expect(build([row(1, { status: 'PENDING' })]).claims_by_status).toEqual([
      { value: 'APPROVED', count: 0 },
      { value: 'REJECTED', count: 0 },
      { value: 'PENDING', count: 1 },
      { value: 'IN_REVIEW', count: 0 },
    ]);
    expect(build([row(1, { status: 'NULL' })]).claims_by_status).toHaveLength(5);
  });

  it('averages only rows with a valid amount and a known currency', () => {
    const report = build([
      row(1, {}, [], 100000),
      row(2, {}, [], 200100),
      row(3, {}, ['AMOUNT_ZERO'], null),
      row(4, { currency: 'NULL' }, ['CURRENCY_UNRECOGNIZED'], 999900),
    ]);
    expect(report.average_amount_by_type[0]).toEqual({
      claim_type: 'OUTPATIENT',
      currency: 'THB',
      rows: 2,
      average: 1500.5,
    });
  });

  it('gives a NULL claim type its own average entries', () => {
    const entries = build([
      row(1, { claim_type: 'NULL', currency: 'VND' }, [], 50000),
    ]).average_amount_by_type;
    expect(entries.slice(-2)).toEqual([
      { claim_type: 'NULL', currency: 'THB', rows: 0, average: null },
      { claim_type: 'NULL', currency: 'VND', rows: 1, average: 500 },
    ]);
  });

  it('reports null, not zero, for a pair with no rows', () => {
    const dental = build([row(1)]).average_amount_by_type.filter((e) => e.claim_type === 'DENTAL');
    expect(dental).toEqual([
      { claim_type: 'DENTAL', currency: 'THB', rows: 0, average: null },
      { claim_type: 'DENTAL', currency: 'VND', rows: 0, average: null },
    ]);
  });

  it('ranks diagnoses by count, then A-Z, leaving out NULL', () => {
    const diagnoses = ['B', 'A', 'C', 'C', 'NULL', 'NULL', 'NULL', 'D', 'E', 'F'];
    const report = build(diagnoses.map((d, i) => row(i + 1, { diagnosis: d })));
    expect(report.top_diagnoses).toEqual([
      { diagnosis: 'C', count: 2 },
      { diagnosis: 'A', count: 1 },
      { diagnosis: 'B', count: 1 },
      { diagnosis: 'D', count: 1 },
      { diagnosis: 'E', count: 1 },
    ]);
  });

  it('groups diagnoses without regard to casing', () => {
    const report = build([row(1, { diagnosis: 'Flu' }), row(2, { diagnosis: 'FLU' })]);
    expect(report.top_diagnoses).toEqual([{ diagnosis: 'Flu', count: 2 }]);
  });

  it('shows fewer than 5 diagnoses when fewer exist', () => {
    expect(
      build([row(1, { diagnosis: 'Flu' }), row(2, { diagnosis: 'Asthma' })]).top_diagnoses,
    ).toHaveLength(2);
  });

  it('keeps only the file name of the source', () => {
    expect(buildReport(cleanupResult([]), '/some/dir/claims.csv').source_file).toBe('claims.csv');
    expect(buildReport(cleanupResult([]), 'C:\\dir\\claims.csv').source_file).toBe('claims.csv');
  });

  it('reports all zeros for an empty result', () => {
    const report = build([]);
    expect(report.row_counts).toEqual({ before: 0, duplicates_removed: 0, after: 0 });
    expect(report.issues.rows_with_any_issue).toBe(0);
    expect(report.top_diagnoses).toEqual([]);
    expect(report.average_amount_by_type.every((e) => e.average === null)).toBe(true);
  });

  it('emits keys in schema order', () => {
    expect(Object.keys(build([]))).toEqual([
      'source_file',
      'row_counts',
      'issues',
      'claims_by_type',
      'claims_by_status',
      'average_amount_by_type',
      'top_diagnoses',
    ]);
  });
});
