import { parse } from 'csv-parse/sync';
import { schemaErrors } from '../../test/helpers/schema';
import { CLAIM_COLUMNS } from '../shared/constants/columns';
import { generateClaims } from './generator';

const seed42 = generateClaims({ seed: 42 });

describe('generateClaims', () => {
  it('writes the FR-001 header and 500 data rows', () => {
    const [header, ...rows] = parse(seed42.csv);
    expect(header).toEqual([...CLAIM_COLUMNS]);
    expect(rows).toHaveLength(500);
  });

  it('logs 86 rows with issues, 15 with several, and every variant', () => {
    const { issueLog } = seed42;
    expect(issueLog.rows_with_issues).toBe(86);
    expect(issueLog.rows).toHaveLength(86);
    expect(issueLog.rows_with_multiple_issues).toBe(15);
    expect(issueLog.variant_counts).toHaveLength(21);
    expect(issueLog.variant_counts.every((v) => v.count >= 1)).toBe(true);
  });

  it('sorts log rows by source_row', () => {
    const rows = seed42.issueLog.rows.map((r) => r.source_row);
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
  });

  it('writes a log that satisfies issue-log.schema.json', () => {
    expect(schemaErrors('issue-log.schema.json', seed42.issueLog)).toEqual([]);
  });

  it('is identical for the same seed', () => {
    expect(generateClaims({ seed: 42 })).toEqual(seed42);
  });

  it('differs for a different seed', () => {
    expect(generateClaims({ seed: 43 }).csv).not.toBe(seed42.csv);
  });

  it('uses seed 42 by default', () => {
    expect(generateClaims()).toEqual(seed42);
  });
});
