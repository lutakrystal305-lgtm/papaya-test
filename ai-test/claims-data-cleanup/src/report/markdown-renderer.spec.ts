import { cleanClaimRow as row, cleanupResult } from '../testing/claim-rows';
import { formatAmount } from './amount-math';
import { renderReportMarkdown } from './markdown-renderer';
import { buildReport } from './report-builder';

const sample = buildReport(
  cleanupResult(
    [
      row(1, {}, [], 264211),
      row(
        2,
        { claim_type: 'INPATIENT', currency: 'VND', diagnosis: 'Asthma' },
        ['AMOUNT_REFORMATTED'],
        1480000000,
      ),
      row(3, { status: 'NULL', diagnosis: 'NULL' }, ['MISSING_STATUS', 'MISSING_DIAGNOSIS'], null),
    ],
    1,
  ),
  'claims.csv',
);

describe('renderReportMarkdown', () => {
  const markdown = renderReportMarkdown(sample);

  it('renders the sections in order', () => {
    const headings = markdown.split('\n').filter((line) => line.startsWith('#'));
    expect(headings).toEqual([
      '# Data Quality Report',
      '## Row counts',
      '## Issues found',
      '## Claims by type',
      '## Claims by status',
      '## Average amount by claim type',
      '## Top 5 diagnoses',
    ]);
  });

  it('names the source file', () => {
    expect(markdown).toContain('Source: `claims.csv`');
  });

  it('shows the row counts', () => {
    expect(markdown).toContain('| Rows before cleaning | 4 |');
    expect(markdown).toContain('| Duplicates removed | 1 |');
    expect(markdown).toContain('| Rows after cleaning | 3 |');
  });

  it('lists every issue code with column, severity and rows', () => {
    expect(markdown).toContain('| `MISSING_STATUS` | status | invalid | 1 |');
    expect(markdown).toContain('| `AMOUNT_REFORMATTED` | submitted_amount | fixed | 1 |');
    expect(markdown).toContain('| `DATE_INVALID` | submitted_date | invalid | 0 |');
    expect(markdown).toContain('Rows with at least one issue: **2**');
    expect(markdown).toContain('Rows with more than one issue: **1**');
  });

  it('shows claims by type and status, including NULL', () => {
    expect(markdown).toContain('| OUTPATIENT | 2 |');
    expect(markdown).toContain('| DENTAL | 0 |');
    expect(markdown).toContain('| NULL | 1 |');
  });

  it('formats averages and shows — for pairs with no rows', () => {
    expect(markdown).toContain(`| OUTPATIENT | THB | 1 | ${formatAmount(264211)} |`);
    expect(markdown).toContain('| INPATIENT | VND | 1 | 14,800,000.00 |');
    expect(markdown).toContain('| DENTAL | THB | 0 | — |');
  });

  it('ranks the top diagnoses', () => {
    expect(markdown).toContain('| 1 | Asthma | 1 |');
    expect(markdown).toContain('| 2 | Flu | 1 |');
  });

  it('says so when no diagnoses are recorded', () => {
    expect(renderReportMarkdown(buildReport(cleanupResult([]), 'x.csv'))).toContain(
      '_No diagnoses recorded._',
    );
  });

  it('ends with exactly one newline', () => {
    expect(markdown.endsWith('\n')).toBe(true);
    expect(markdown.endsWith('\n\n')).toBe(false);
  });

  it('renders the same input to the same output', () => {
    expect(renderReportMarkdown(sample)).toBe(markdown);
  });
});
