import { createPrng } from './prng';

const take = (seed: number, n: number): number[] => {
  const prng = createPrng(seed);
  return Array.from({ length: n }, () => prng.next());
};

describe('createPrng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(42, 10)).toEqual(take(42, 10));
  });

  it('gives a different sequence for a different seed', () => {
    expect(take(42, 10)).not.toEqual(take(43, 10));
  });

  it('returns values in [0, 1)', () => {
    expect(take(7, 10_000).every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('returns int(min, max) within the bounds and hits both ends', () => {
    const prng = createPrng(1);
    const values = Array.from({ length: 10_000 }, () => prng.int(3, 7));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(7);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it('picks an element of the array', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(createPrng(5).pick(items));
  });

  it('returns a shuffled copy and leaves the input unchanged', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = createPrng(9).shuffle(input);
    expect(input).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
    expect(shuffled).not.toEqual(input);
  });

  it('shuffles the same way for the same seed', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(createPrng(9).shuffle(input)).toEqual(createPrng(9).shuffle(input));
  });

  it.each([0, 4294967295])('works with seed %p', (seed) => {
    expect(take(seed, 3)).toHaveLength(3);
  });
});
