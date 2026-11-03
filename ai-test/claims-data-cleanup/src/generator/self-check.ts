import { removeExactDuplicates } from '../cleaning/deduplicate';
import {
  EXACT_DUPLICATES,
  ISSUE_ROWS_MAX,
  ISSUE_ROWS_MIN,
  MIN_MULTI_ISSUE_ROWS,
  TOTAL_ROWS,
} from '../shared/constants/generator.constants';
import { GeneratorSelfCheckError } from '../shared/errors';
import type { ClaimValues, IssueLog } from '../shared/types';

function check(condition: boolean, message: string): void {
  if (!condition) throw new GeneratorSelfCheckError(`generator self-check failed: ${message}`);
}

/** Recounts from the generated rows themselves rather than trusting the allocation plan. */
export function assertGeneratedDataset(rows: readonly ClaimValues[], log: IssueLog): void {
  check(rows.length === TOTAL_ROWS, `expected ${TOTAL_ROWS} rows, got ${rows.length}`);
  const { duplicates } = removeExactDuplicates(
    rows.map((values, i) => ({ sourceRow: i + 1, values })),
  );
  check(
    duplicates.length === EXACT_DUPLICATES,
    `expected ${EXACT_DUPLICATES} exact duplicates, got ${duplicates.length}`,
  );
  check(
    log.rows_with_issues >= ISSUE_ROWS_MIN && log.rows_with_issues <= ISSUE_ROWS_MAX,
    `expected ${ISSUE_ROWS_MIN}-${ISSUE_ROWS_MAX} rows with issues, got ${log.rows_with_issues}`,
  );
  check(
    log.rows_with_multiple_issues >= MIN_MULTI_ISSUE_ROWS,
    `expected at least ${MIN_MULTI_ISSUE_ROWS} rows with several issues, got ${log.rows_with_multiple_issues}`,
  );
  const unused = log.variant_counts.find((v) => v.count < 1);
  check(unused === undefined, `variant ${unused?.variant} never appears`);
}
