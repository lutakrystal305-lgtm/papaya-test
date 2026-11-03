import { ISSUE_VARIANTS } from './issue-variants';
import { allocateIssues } from './allocation';
import { buildBaseRecords } from './base-records';
import { createPrng } from './prng';

function plan(seed = 42): ReturnType<typeof allocateIssues> {
  const prng = createPrng(seed);
  return allocateIssues(prng, buildBaseRecords(prng, 489));
}

const rows = plan();
const ofKind = (kind: string) => rows.filter((r) => r.kind === kind);
const columnOf = (id: string) => ISSUE_VARIANTS.find((v) => v.id === id)!.column;

describe('allocateIssues', () => {
  it('returns 500 rows', () => {
    expect(rows).toHaveLength(500);
  });

  it('makes 60 single-issue rows whose first 21 cover every variant once', () => {
    const singles = ofKind('single');
    expect(singles).toHaveLength(60);
    expect(singles.every((r) => r.variants.length === 1)).toBe(true);
    const firstVariants = rows
      .filter((r) => r.kind === 'single' && r.coverageSlot !== undefined)
      .sort((a, b) => a.coverageSlot! - b.coverageSlot!)
      .map((r) => r.variants[0]);
    expect(firstVariants).toEqual(ISSUE_VARIANTS.map((v) => v.id));
  });

  it('makes 12 multi-issue rows with 2-3 variants in different columns', () => {
    const multis = ofKind('multi');
    expect(multis).toHaveLength(12);
    for (const row of multis) {
      expect(row.variants.length).toBeGreaterThanOrEqual(2);
      expect(row.variants.length).toBeLessThanOrEqual(3);
      expect(new Set(row.variants.map(columnOf)).size).toBe(row.variants.length);
    }
  });

  it('includes the fixed negative amount + thb + N/A row', () => {
    const fixed = ofKind('multi').filter(
      (r) =>
        [...r.variants].sort().join() ===
        ['amount:negative', 'currency:thb', 'diagnosis:N/A'].sort().join(),
    );
    expect(fixed).toHaveLength(1);
  });

  it('makes 8 exact duplicates, each placed after its original', () => {
    const duplicates = ofKind('duplicate');
    expect(duplicates).toHaveLength(8);
    for (const copy of duplicates) {
      const originalIndex = rows.findIndex(
        (r) => r.baseIndex === copy.baseIndex && r.kind !== 'duplicate',
      );
      expect(rows.indexOf(copy)).toBeGreaterThan(originalIndex);
      expect(copy.values).toEqual(rows[originalIndex].values);
    }
  });

  it('makes 3 near-copies (name, date, currency), each after its original', () => {
    const copies = ofKind('near-copy');
    expect(copies.map((c) => columnOf(c.variants[0])).sort()).toEqual([
      'currency',
      'member_name',
      'submitted_date',
    ]);
    for (const copy of copies) {
      const original = rows.find(
        (r) => r.baseIndex === copy.baseIndex && r.kind === 'near-copy-original',
      )!;
      expect(rows.indexOf(copy)).toBeGreaterThan(rows.indexOf(original));
      expect(copy.values.claim_id).toBe(original.values.claim_id);
      expect(copy.issues).toContain('CONFLICTING_CLAIM_ID');
      expect(original.issues).toEqual(['CONFLICTING_CLAIM_ID']);
    }
  });

  it('copies only clean base rows and uses no base row twice', () => {
    const originalKinds = rows.filter((r) => r.kind !== 'duplicate' && r.kind !== 'near-copy');
    expect(new Set(originalKinds.map((r) => r.baseIndex)).size).toBe(489);
    for (const copy of [...ofKind('duplicate'), ...ofKind('near-copy')]) {
      const original = originalKinds.find((r) => r.baseIndex === copy.baseIndex)!;
      expect(['clean', 'near-copy-original']).toContain(original.kind);
    }
  });

  it('gives the same plan for the same seed', () => {
    expect(plan(42)).toEqual(rows);
  });

  it('gives a different plan for a different seed', () => {
    expect(plan(43)).not.toEqual(rows);
  });
});
