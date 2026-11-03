import { GeneratorSelfCheckError } from '../shared/errors';
import type { ClaimValues, IssueLog } from '../shared/types';
import { CLEAN_VALUES } from '../testing/claim-rows';
import { ISSUE_VARIANTS } from './issue-variants';
import { assertGeneratedDataset } from './self-check';

function dataset(): { rows: ClaimValues[]; log: IssueLog } {
  const rows = Array.from({ length: 492 }, (_, i) => ({ ...CLEAN_VALUES, claim_id: `CLM-${i}` }));
  rows.push(...rows.slice(0, 8).map((r) => ({ ...r })));
  return {
    rows,
    log: {
      seed: 42,
      total_rows: 500,
      rows_with_issues: 86,
      rows_with_multiple_issues: 15,
      variant_counts: ISSUE_VARIANTS.map((v) => ({ variant: v.id, count: 1 })),
      rows: [],
    },
  };
}

function expectFailure(mutate: (d: ReturnType<typeof dataset>) => void, message: RegExp): void {
  const d = dataset();
  mutate(d);
  expect(() => assertGeneratedDataset(d.rows, d.log)).toThrow(GeneratorSelfCheckError);
  expect(() => assertGeneratedDataset(d.rows, d.log)).toThrow(message);
}

describe('assertGeneratedDataset', () => {
  it('accepts a valid dataset', () => {
    const d = dataset();
    expect(() => assertGeneratedDataset(d.rows, d.log)).not.toThrow();
  });

  it('rejects a row count other than 500', () => {
    expectFailure((d) => d.rows.pop(), /expected 500 rows, got 499/);
  });

  it('rejects a duplicate count other than 8', () => {
    expectFailure(
      (d) => (d.rows[499] = { ...d.rows[499], claim_id: 'unique' }),
      /expected 8 exact duplicates, got 7/,
    );
  });

  it.each([74, 101])('rejects %p rows with issues', (count) => {
    expectFailure((d) => (d.log.rows_with_issues = count), /rows with issues/);
  });

  it('rejects fewer than 5 rows with several issues', () => {
    expectFailure(
      (d) => (d.log.rows_with_multiple_issues = 4),
      /at least 5 rows with several issues/,
    );
  });

  it('rejects a variant that never appears', () => {
    expectFailure(
      (d) => (d.log.variant_counts[3].count = 0),
      /variant member_name:lower never appears/,
    );
  });
});
