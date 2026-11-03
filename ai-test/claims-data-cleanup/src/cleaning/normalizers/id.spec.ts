import { normalizeId } from './id';

describe('normalizeId', () => {
  it.each(['CLM-00123', 'whatever', 'POL-1'])(
    'returns %p unchanged with no code (A-3)',
    (value) => {
      expect(normalizeId(value)).toEqual({ value, issues: [] });
    },
  );
});
