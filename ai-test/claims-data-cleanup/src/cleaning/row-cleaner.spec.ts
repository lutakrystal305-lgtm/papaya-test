import { CLAIM_COLUMNS } from '../shared/constants/columns';
import { MISSING_CODE_BY_COLUMN } from '../shared/constants/issue-catalogue';
import { cleanRow } from './row-cleaner';
import { rawRow } from '../testing/claim-rows';

describe('cleanRow', () => {
  it('applies every fix and lists every issue for scenario 8', () => {
    const row = cleanRow(
      rawRow(1, { submitted_amount: '-500', currency: 'thb', diagnosis: 'N/A' }),
    );
    expect(row.issues).toEqual(['MISSING_DIAGNOSIS', 'AMOUNT_NEGATIVE', 'CURRENCY_NORMALIZED']);
    expect(row.values).toMatchObject({
      submitted_amount: '-500',
      currency: 'THB',
      diagnosis: 'NULL',
    });
  });

  it.each(CLAIM_COLUMNS)('replaces a missing %s with NULL and its MISSING_* code', (column) => {
    const row = cleanRow(rawRow(1, { [column]: ' n/a ' }));
    expect(row.values[column]).toBe('NULL');
    expect(row.issues).toEqual([MISSING_CODE_BY_COLUMN[column]]);
  });

  it('raises no issue for extra spaces alone', () => {
    const row = cleanRow(rawRow(1, { member_name: '  John   Doe ', currency: ' THB' }));
    expect(row.issues).toEqual([]);
    expect(row.values.member_name).toBe('John Doe');
  });

  it('sets amountHundredths for a valid positive amount', () => {
    expect(cleanRow(rawRow(1, { submitted_amount: '1,500.25' })).amountHundredths).toBe(150025);
  });

  it.each(['0', '-1', 'abc', ''])('leaves amountHundredths null for %p', (amount) => {
    expect(cleanRow(rawRow(1, { submitted_amount: amount })).amountHundredths).toBeNull();
  });

  it('sorts issues into catalogue order', () => {
    const row = cleanRow(rawRow(1, { status: 'approved', member_name: 'JOHN DOE', claim_id: '' }));
    expect(row.issues).toEqual(['MISSING_CLAIM_ID', 'NAME_CASING_FIXED', 'STATUS_NORMALIZED']);
  });

  it('keeps the source row number', () => {
    expect(cleanRow(rawRow(7)).sourceRow).toBe(7);
  });
});
