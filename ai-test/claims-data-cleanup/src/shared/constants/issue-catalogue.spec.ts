import { CLAIM_COLUMNS } from './columns';
import { ISSUE_CATALOGUE, issueRank, MISSING_CODE_BY_COLUMN } from './issue-catalogue';

const EXPECTED_ORDER = [
  'DUPLICATE_ROW',
  'CONFLICTING_CLAIM_ID',
  'MISSING_CLAIM_ID',
  'MISSING_POLICY_ID',
  'MISSING_MEMBER_NAME',
  'NAME_CASING_FIXED',
  'MISSING_CLAIM_TYPE',
  'CLAIM_TYPE_NORMALIZED',
  'CLAIM_TYPE_UNRECOGNIZED',
  'MISSING_DIAGNOSIS',
  'DIAGNOSIS_CASING_FIXED',
  'MISSING_AMOUNT',
  'AMOUNT_REFORMATTED',
  'AMOUNT_ZERO',
  'AMOUNT_NEGATIVE',
  'AMOUNT_UNPARSEABLE',
  'MISSING_CURRENCY',
  'CURRENCY_NORMALIZED',
  'CURRENCY_UNRECOGNIZED',
  'MISSING_DATE',
  'DATE_REFORMATTED',
  'DATE_INVALID',
  'MISSING_STATUS',
  'STATUS_NORMALIZED',
  'STATUS_UNRECOGNIZED',
];

describe('ISSUE_CATALOGUE', () => {
  it('lists the 25 codes in data-model order', () => {
    expect(ISSUE_CATALOGUE.map((entry) => entry.code)).toEqual(EXPECTED_ORDER);
  });

  it('has unique codes', () => {
    expect(new Set(ISSUE_CATALOGUE.map((entry) => entry.code)).size).toBe(25);
  });

  it('has DUPLICATE_ROW as the only removed, row-level entry', () => {
    const removed = ISSUE_CATALOGUE.filter(
      (e) => e.severity === 'removed' || (e.column as string) === 'row',
    );
    expect(removed).toEqual([{ code: 'DUPLICATE_ROW', column: 'row', severity: 'removed' }]);
  });

  it('has exactly one MISSING_* code per column', () => {
    for (const column of CLAIM_COLUMNS) {
      const missing = ISSUE_CATALOGUE.filter(
        (e) => (e.column as string) === column && e.code.startsWith('MISSING_'),
      );
      expect(missing).toHaveLength(1);
      expect(MISSING_CODE_BY_COLUMN[column]).toBe(missing[0].code);
    }
  });

  it('ranks each code by its catalogue index', () => {
    ISSUE_CATALOGUE.forEach((entry, index) => expect(issueRank(entry.code)).toBe(index));
  });
});
