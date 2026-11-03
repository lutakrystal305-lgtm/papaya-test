import { generateClaims } from '../src/generator/generator';
import { runCleanup } from '../src/run-cleanup';

describe.each([42, 1, 7, 2024, 4294967295])(
  'seed %p: cleanup finds exactly the logged issues (SC-001)',
  (seed) => {
    const { csv, issueLog } = generateClaims({ seed });
    const { result } = runCleanup(csv, 'claims_dirty.csv');
    const logged = new Map(issueLog.rows.map((r) => [r.source_row, r.issues]));

    it('removes exactly the rows logged as DUPLICATE_ROW', () => {
      const loggedDuplicates = issueLog.rows
        .filter((r) => r.issues.length === 1 && r.issues[0] === 'DUPLICATE_ROW')
        .map((r) => r.source_row);
      expect(result.duplicates.map((d) => d.sourceRow)).toEqual(loggedDuplicates);
    });

    it('reports the logged codes on every kept row and none on clean rows', () => {
      const mismatches = result.rows
        .map((row) => ({
          row: row.sourceRow,
          found: row.issues,
          logged: logged.get(row.sourceRow) ?? [],
        }))
        .filter((m) => m.found.join('|') !== m.logged.join('|'));
      expect(mismatches).toEqual([]);
    });

    it('detects as many codes in total as were logged', () => {
      const detected =
        result.rows.reduce((n, row) => n + row.issues.length, 0) + result.duplicates.length;
      const total = issueLog.rows.reduce((n, row) => n + row.issues.length, 0);
      expect(detected).toBe(total);
    });
  },
);
