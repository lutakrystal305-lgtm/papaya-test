import { cleanRow } from '../cleaning/row-cleaner';
import { titleCase } from '../cleaning/normalizers/title-case';
import { DIAGNOSES, MEMBER_NAMES } from '../shared/constants/generator.constants';
import { CLAIM_TYPES, CURRENCIES, STATUSES } from '../shared/constants/mappings';
import { buildBaseRecords } from './base-records';
import { createPrng } from './prng';

const records = buildBaseRecords(createPrng(42), 489);
const isoDate2024 = /^2024-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

describe('buildBaseRecords', () => {
  it('numbers claim IDs in sequence', () => {
    expect(records.map((r) => r.claim_id)).toEqual(
      Array.from({ length: 489 }, (_, i) => `CLM-${String(i + 1).padStart(5, '0')}`),
    );
  });

  it('uses POL-### policy IDs', () => {
    expect(records.every((r) => /^POL-\d{3}$/.test(r.policy_id))).toBe(true);
  });

  it('uses fixed name and diagnosis lists that title case leaves unchanged (A-6)', () => {
    for (const value of [...MEMBER_NAMES, ...DIAGNOSES]) {
      expect(titleCase(value, 'NAME_CASING_FIXED').issues).toEqual([]);
      expect(value).not.toMatch(/[-']|Mc/);
    }
    expect(records.every((r) => MEMBER_NAMES.includes(r.member_name))).toBe(true);
    expect(records.every((r) => DIAGNOSES.includes(r.diagnosis))).toBe(true);
  });

  it('uses only standard claim types, currencies and statuses', () => {
    expect(records.every((r) => (CLAIM_TYPES as readonly string[]).includes(r.claim_type))).toBe(
      true,
    );
    expect(records.every((r) => (CURRENCIES as readonly string[]).includes(r.currency))).toBe(true);
    expect(records.every((r) => (STATUSES as readonly string[]).includes(r.status))).toBe(true);
  });

  it('keeps amounts in the currency ranges', () => {
    for (const r of records) {
      const amount = Number(r.submitted_amount);
      expect(String(amount)).toBe(r.submitted_amount);
      if (r.currency === 'THB') expect(amount >= 500 && amount <= 200_000).toBe(true);
      else expect(amount % 1000 === 0 && amount >= 100_000 && amount <= 50_000_000).toBe(true);
    }
  });

  it('uses valid ISO dates in 2024', () => {
    expect(records.every((r) => isoDate2024.test(r.submitted_date))).toBe(true);
  });

  it('produces rows that clean with no issues', () => {
    expect(
      records.every((values, i) => cleanRow({ sourceRow: i + 1, values }).issues.length === 0),
    ).toBe(true);
  });

  it('is the same for the same seed', () => {
    expect(buildBaseRecords(createPrng(42), 489)).toEqual(records);
  });
});
