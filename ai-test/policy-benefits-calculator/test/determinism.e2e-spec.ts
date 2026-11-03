import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { calculateBenefits } from '@/index';

const ROOT = join(__dirname, '..');
const readJson = <T = unknown>(path: string): T =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as T;

// Deterministic PRNG (mulberry32) so every run shuffles the same way.
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: readonly T[], seed: number): T[] => {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

describe('order independence (SC-005, FR-023)', () => {
  const policy = readJson('data/policy.sample.json');
  const expenses = readJson<unknown[]>('data/expenses.sample.json');
  const expected = readFileSync(join(ROOT, 'expected/sample/results.json'), 'utf8');

  it.each(SEEDS)('seed %i produces output identical to the expected results', (seed) => {
    const shuffled = shuffle(expenses, seed);
    expect(shuffled).not.toEqual(expenses);
    expect(`${JSON.stringify(calculateBenefits(policy, shuffled), null, 2)}\n`).toBe(expected);
  });
});
