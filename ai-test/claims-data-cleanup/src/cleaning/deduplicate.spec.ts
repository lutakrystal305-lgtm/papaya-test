import { removeExactDuplicates } from './deduplicate';
import { rawRow } from '../testing/claim-rows';

describe('removeExactDuplicates', () => {
  it('keeps the first of two identical rows and records the duplicate', () => {
    const { kept, duplicates } = removeExactDuplicates([rawRow(1), rawRow(2)]);
    expect(kept.map((r) => r.sourceRow)).toEqual([1]);
    expect(duplicates).toEqual([{ sourceRow: 2, duplicateOf: 1 }]);
  });

  it('does not treat a casing difference as a duplicate (Q1)', () => {
    const { kept } = removeExactDuplicates([
      rawRow(1, { member_name: 'JOHN DOE' }),
      rawRow(2, { member_name: 'John Doe' }),
    ]);
    expect(kept).toHaveLength(2);
  });

  it('does not trim before comparing', () => {
    const { kept } = removeExactDuplicates([
      rawRow(1, { claim_id: ' X' }),
      rawRow(2, { claim_id: 'X' }),
    ]);
    expect(kept).toHaveLength(2);
  });

  it('deduplicates rows with an empty claim_id', () => {
    const { duplicates } = removeExactDuplicates([
      rawRow(1, { claim_id: '' }),
      rawRow(2, { claim_id: '' }),
    ]);
    expect(duplicates).toEqual([{ sourceRow: 2, duplicateOf: 1 }]);
  });

  it('keeps input order and does not change the input', () => {
    const input = [
      rawRow(1, { claim_id: 'B' }),
      rawRow(2, { claim_id: 'A' }),
      rawRow(3, { claim_id: 'B' }),
    ];
    const snapshot = JSON.parse(JSON.stringify(input)) as unknown;
    const { kept } = removeExactDuplicates(input);
    expect(kept.map((r) => r.sourceRow)).toEqual([1, 2]);
    expect(input).toEqual(snapshot);
  });
});
