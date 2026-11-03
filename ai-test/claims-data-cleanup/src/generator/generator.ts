import { serializeDirtyCsv } from '../csv/csv-writer';
import { DEFAULT_SEED } from '../shared/constants/cli.constants';
import { BASE_ROWS } from '../shared/constants/generator.constants';
import type { IssueLog } from '../shared/types';
import { allocateIssues } from './allocation';
import type { PlannedRow } from './allocation';
import { buildBaseRecords } from './base-records';
import { ISSUE_VARIANTS } from './issue-variants';
import { createPrng } from './prng';
import { assertGeneratedDataset } from './self-check';

export interface GeneratedDataset {
  csv: string;
  issueLog: IssueLog;
}

function buildIssueLog(seed: number, planned: readonly PlannedRow[]): IssueLog {
  const rows = planned
    .map((row, i) => ({ source_row: i + 1, claim_id: row.values.claim_id, issues: row.issues }))
    .filter((row) => row.issues.length > 0);
  return {
    seed,
    total_rows: planned.length,
    rows_with_issues: rows.length,
    rows_with_multiple_issues: rows.filter((row) => row.issues.length > 1).length,
    variant_counts: ISSUE_VARIANTS.map((v) => ({
      variant: v.id,
      count: planned.filter((row) => row.variants.includes(v.id)).length,
    })),
    rows,
  };
}

export function generateClaims({ seed = DEFAULT_SEED }: { seed?: number } = {}): GeneratedDataset {
  const prng = createPrng(seed);
  const planned = allocateIssues(prng, buildBaseRecords(prng, BASE_ROWS));
  const values = planned.map((row) => row.values);
  const issueLog = buildIssueLog(seed, planned);
  assertGeneratedDataset(values, issueLog);
  return { csv: serializeDirtyCsv(values), issueLog };
}
