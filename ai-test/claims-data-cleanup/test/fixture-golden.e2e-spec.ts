import { renderReportMarkdown } from '../src/report/markdown-renderer';
import { runCleanup } from '../src/run-cleanup';
import { readFixture } from './helpers/fixtures';
import { schemaErrors } from './helpers/schema';

const DIRTY = 'all-issues.dirty.csv';

describe('clean CSV', () => {
  it('matches the hand-written expected clean CSV byte for byte', () => {
    const { cleanCsv } = runCleanup(readFixture(DIRTY), DIRTY);
    expect(cleanCsv).toBe(readFixture('all-issues.expected-clean.csv'));
  });

  it('keeps rows before - duplicates = rows after', () => {
    const { result } = runCleanup(readFixture(DIRTY), DIRTY);
    expect(result.rowsBefore - result.duplicates.length).toBe(result.rows.length);
    expect(result.duplicates).toEqual([
      { sourceRow: 5, duplicateOf: 1 },
      { sourceRow: 57, duplicateOf: 56 },
    ]);
  });

  it('gives identical output on every run (FR-019)', () => {
    expect(runCleanup(readFixture(DIRTY), DIRTY)).toEqual(runCleanup(readFixture(DIRTY), DIRTY));
  });
});

describe('report', () => {
  const run = (): ReturnType<typeof runCleanup> => runCleanup(readFixture(DIRTY), DIRTY);

  it('matches the hand-computed expected report', () => {
    expect(run().report).toEqual(JSON.parse(readFixture('all-issues.expected-report.json')));
  });

  it('serializes to JSON that satisfies report.schema.json', () => {
    const json: unknown = JSON.parse(JSON.stringify(run().report, null, 2) + '\n');
    expect(schemaErrors('report.schema.json', json)).toEqual([]);
  });

  it('renders the Markdown from the same report object', () => {
    const { report, reportMarkdown } = run();
    expect(reportMarkdown).toBe(renderReportMarkdown(report));
  });
});
