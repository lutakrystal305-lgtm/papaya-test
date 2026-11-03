import {
  BASE_ROWS,
  EXACT_DUPLICATES,
  MAX_VARIANTS_PER_MULTI_ROW,
  MIN_VARIANTS_PER_MULTI_ROW,
  MULTI_ISSUE_ROWS,
  SINGLE_ISSUE_ROWS,
} from '../shared/constants/generator.constants';
import { sortIssues } from '../shared/constants/issue-catalogue';
import { GeneratorSelfCheckError } from '../shared/errors';
import type { ClaimValues, IssueCode } from '../shared/types';
import { ISSUE_VARIANTS, variantById } from './issue-variants';
import type { IssueVariant } from './issue-variants';
import type { Prng } from './prng';

export type PlannedRowKind =
  'clean' | 'single' | 'multi' | 'duplicate' | 'near-copy' | 'near-copy-original';

export interface PlannedRow {
  kind: PlannedRowKind;
  baseIndex: number;
  values: ClaimValues;
  variants: string[];
  issues: IssueCode[];
  /** Set on the first 21 single-issue rows: the index of the variant they guarantee. */
  coverageSlot?: number;
}

const FIXED_MULTI_VARIANTS = ['amount:negative', 'currency:thb', 'diagnosis:N/A'];
const NEAR_COPY_VARIANTS = [
  ['member_name:upper'],
  ['date:dd/mm/yyyy'],
  ['currency:thb', 'currency:vnd'],
];

/** Shuffled base indices; each `take` removes the first index that satisfies the predicate. */
class IndexPool {
  constructor(private readonly remaining: number[]) {}

  take(accepts: (index: number) => boolean): number {
    const position = this.remaining.findIndex(accepts);
    if (position < 0) throw new GeneratorSelfCheckError('no eligible base row left to allocate');
    return this.remaining.splice(position, 1)[0];
  }
}

function variantRow(
  kind: PlannedRowKind,
  baseIndex: number,
  record: ClaimValues,
  variants: readonly IssueVariant[],
): PlannedRow {
  return {
    kind,
    baseIndex,
    values: variants.reduce((values, v) => v.apply(values), record),
    variants: variants.map((v) => v.id),
    issues: sortIssues(variants.flatMap((v) => v.expectedCodes)),
  };
}

function eligibleVariants(record: ClaimValues): IssueVariant[] {
  return ISSUE_VARIANTS.filter((v) => v.appliesTo(record));
}

function distinctColumnVariants(prng: Prng, record: ClaimValues, count: number): IssueVariant[] {
  const chosen: IssueVariant[] = [];
  for (const candidate of prng.shuffle(eligibleVariants(record))) {
    if (chosen.length === count) break;
    if (!chosen.some((v) => v.column === candidate.column)) chosen.push(candidate);
  }
  return chosen;
}

interface Allocation {
  pool: IndexPool;
  base: readonly ClaimValues[];
  planned: Map<number, PlannedRow>;
  copies: PlannedRow[];
}

function allocateSingles({ pool, base, planned }: Allocation, prng: Prng): void {
  ISSUE_VARIANTS.forEach((variant, slot) => {
    const i = pool.take((index) => variant.appliesTo(base[index]));
    planned.set(i, { ...variantRow('single', i, base[i], [variant]), coverageSlot: slot });
  });
  for (let n = ISSUE_VARIANTS.length; n < SINGLE_ISSUE_ROWS; n++) {
    const i = pool.take(() => true);
    planned.set(i, variantRow('single', i, base[i], [prng.pick(eligibleVariants(base[i]))]));
  }
}

function allocateMultis({ pool, base, planned }: Allocation, prng: Prng): void {
  const fixed = FIXED_MULTI_VARIANTS.map(variantById);
  const first = pool.take((index) => fixed.every((v) => v.appliesTo(base[index])));
  planned.set(first, variantRow('multi', first, base[first], fixed));
  for (let n = 1; n < MULTI_ISSUE_ROWS; n++) {
    const i = pool.take(() => true);
    const count = prng.int(MIN_VARIANTS_PER_MULTI_ROW, MAX_VARIANTS_PER_MULTI_ROW);
    planned.set(i, variantRow('multi', i, base[i], distinctColumnVariants(prng, base[i], count)));
  }
}

function allocateCopies({ pool, base, planned, copies }: Allocation): void {
  for (let n = 0; n < EXACT_DUPLICATES; n++) {
    const i = pool.take(() => true);
    copies.push({
      kind: 'duplicate',
      baseIndex: i,
      values: { ...base[i] },
      variants: [],
      issues: ['DUPLICATE_ROW'],
    });
  }
  for (const options of NEAR_COPY_VARIANTS) {
    const candidates = options.map(variantById);
    const i = pool.take((index) => candidates.some((v) => v.appliesTo(base[index])));
    const variant = candidates.find((v) => v.appliesTo(base[i]))!;
    planned.set(i, {
      kind: 'near-copy-original',
      baseIndex: i,
      values: base[i],
      variants: [],
      issues: ['CONFLICTING_CLAIM_ID'],
    });
    const copy = variantRow('near-copy', i, base[i], [variant]);
    copies.push({ ...copy, issues: sortIssues([...copy.issues, 'CONFLICTING_CLAIM_ID']) });
  }
}

function placeCopies(rows: PlannedRow[], copies: readonly PlannedRow[], prng: Prng): PlannedRow[] {
  const placed = [...rows];
  for (const copy of copies) {
    const originalPosition = placed.findIndex(
      (r) => r.baseIndex === copy.baseIndex && r.kind !== 'duplicate' && r.kind !== 'near-copy',
    );
    placed.splice(prng.int(originalPosition + 1, placed.length), 0, copy);
  }
  return placed;
}

/** Places issues by plan, not by chance, so every seed meets FR-003 and FR-004 (research R-07). */
export function allocateIssues(prng: Prng, base: readonly ClaimValues[]): PlannedRow[] {
  if (base.length !== BASE_ROWS)
    throw new GeneratorSelfCheckError(`expected ${BASE_ROWS} base rows`);
  const allocation: Allocation = {
    pool: new IndexPool(prng.shuffle(base.map((_, i) => i))),
    base,
    planned: new Map(),
    copies: [],
  };
  allocateSingles(allocation, prng);
  allocateMultis(allocation, prng);
  allocateCopies(allocation);
  const rows = base.map(
    (values, i): PlannedRow =>
      allocation.planned.get(i) ?? {
        kind: 'clean',
        baseIndex: i,
        values,
        variants: [],
        issues: [],
      },
  );
  return placeCopies(rows, allocation.copies, prng);
}
