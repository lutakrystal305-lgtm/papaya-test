import { cleanRow } from '../cleaning/row-cleaner';
import type { ClaimValues } from '../shared/types';
import { buildBaseRecords } from './base-records';
import { ISSUE_VARIANTS } from './issue-variants';
import { createPrng } from './prng';

const base = buildBaseRecords(createPrng(42), 489);

const R08: [string, string, string, string][] = [
  ['claim_id:missing', 'claim_id', '', 'MISSING_CLAIM_ID'],
  ['policy_id:missing', 'policy_id', '', 'MISSING_POLICY_ID'],
  ['member_name:upper', 'member_name', 'UPPER', 'NAME_CASING_FIXED'],
  ['member_name:lower', 'member_name', 'lower', 'NAME_CASING_FIXED'],
  ['claim_type:outpatient', 'claim_type', 'outpatient', 'CLAIM_TYPE_NORMALIZED'],
  ['claim_type:Outpateint', 'claim_type', 'Outpateint', 'CLAIM_TYPE_NORMALIZED'],
  ['claim_type:OP', 'claim_type', 'OP', 'CLAIM_TYPE_NORMALIZED'],
  ['claim_type:inpatient', 'claim_type', 'inpatient', 'CLAIM_TYPE_NORMALIZED'],
  ['claim_type:IP', 'claim_type', 'IP', 'CLAIM_TYPE_NORMALIZED'],
  ['claim_type:dental', 'claim_type', 'dental', 'CLAIM_TYPE_NORMALIZED'],
  ['diagnosis:empty', 'diagnosis', '', 'MISSING_DIAGNOSIS'],
  ['diagnosis:N/A', 'diagnosis', 'N/A', 'MISSING_DIAGNOSIS'],
  ['diagnosis:n/a', 'diagnosis', 'n/a', 'MISSING_DIAGNOSIS'],
  ['amount:negative', 'submitted_amount', 'negative', 'AMOUNT_NEGATIVE'],
  ['amount:zero', 'submitted_amount', '0', 'AMOUNT_ZERO'],
  ['amount:comma', 'submitted_amount', 'comma', 'AMOUNT_REFORMATTED'],
  ['currency:thb', 'currency', 'thb', 'CURRENCY_NORMALIZED'],
  ['currency:Baht', 'currency', 'Baht', 'CURRENCY_NORMALIZED'],
  ['currency:vnd', 'currency', 'vnd', 'CURRENCY_NORMALIZED'],
  ['date:dd/mm/yyyy', 'submitted_date', 'dd/mm/yyyy', 'DATE_REFORMATTED'],
  ['date:month-name', 'submitted_date', 'month-name', 'DATE_REFORMATTED'],
];

const MONTH =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 2024$/;

function expectedRaw(
  kind: string,
  original: ClaimValues,
  column: keyof ClaimValues,
): RegExp | string {
  const value = original[column];
  switch (kind) {
    case 'UPPER':
      return value.toUpperCase();
    case 'lower':
      return value.toLowerCase();
    case 'negative':
      return `-${value}`;
    case 'comma':
      return /^\d{1,3}(,\d{3})+$/;
    case 'dd/mm/yyyy':
      return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
    case 'month-name':
      return MONTH;
    default:
      return kind;
  }
}

describe('ISSUE_VARIANTS', () => {
  it('lists the 21 R-08 variants in order', () => {
    expect(ISSUE_VARIANTS.map((v) => [v.id, v.column, v.expectedCodes])).toEqual(
      R08.map(([id, column, , code]) => [id, column, [code]]),
    );
  });

  describe.each(R08)('%s', (id, column, kind, code) => {
    const variant = ISSUE_VARIANTS.find((v) => v.id === id)!;
    const record = base.find((r) => variant.appliesTo(r))!;

    it('has an eligible base record', () => {
      expect(record).toBeDefined();
    });

    it('writes the R-08 raw value', () => {
      const changed = variant.apply(record);
      const col = column as keyof ClaimValues;
      const expected = expectedRaw(kind, record, col);
      if (expected instanceof RegExp) expect(changed[col]).toMatch(expected);
      else expect(changed[col]).toBe(expected);
    });

    it(`cleans to exactly ${code}`, () => {
      expect(cleanRow({ sourceRow: 1, values: variant.apply(record) }).issues).toEqual([code]);
    });

    it('does not change the input record', () => {
      const copy = { ...record };
      variant.apply(record);
      expect(record).toEqual(copy);
    });
  });

  it('applies amount:comma only to amounts of at least 1,000', () => {
    const comma = ISSUE_VARIANTS.find((v) => v.id === 'amount:comma')!;
    expect(comma.appliesTo({ ...base[0], submitted_amount: '999' })).toBe(false);
    expect(comma.appliesTo({ ...base[0], submitted_amount: '1000' })).toBe(true);
  });

  it.each([
    ['currency:thb', 'THB'],
    ['currency:Baht', 'THB'],
    ['currency:vnd', 'VND'],
    ['claim_type:Outpateint', 'OUTPATIENT'],
    ['claim_type:IP', 'INPATIENT'],
    ['claim_type:dental', 'DENTAL'],
  ])('applies %s only to %s records', (id, required) => {
    const variant = ISSUE_VARIANTS.find((v) => v.id === id)!;
    const column = id.startsWith('currency') ? 'currency' : 'claim_type';
    for (const record of base) {
      expect(variant.appliesTo(record)).toBe(record[column] === required);
    }
  });
});
