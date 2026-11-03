import type { CleanClaimRow } from '../shared/types';
import { flagClaimIdConflicts } from './claim-id-conflicts';
import { CLEAN_VALUES } from '../testing/claim-rows';

function cleanRow(
  sourceRow: number,
  claimId: string,
  issues: CleanClaimRow['issues'] = [],
): CleanClaimRow {
  return {
    sourceRow,
    values: { ...CLEAN_VALUES, claim_id: claimId },
    issues,
    amountHundredths: 150000,
  };
}

describe('flagClaimIdConflicts', () => {
  it('flags every row whose claim_id appears more than once', () => {
    const rows = flagClaimIdConflicts([cleanRow(1, 'A'), cleanRow(2, 'B'), cleanRow(3, 'A')]);
    expect(rows.map((r) => r.issues)).toEqual([
      ['CONFLICTING_CLAIM_ID'],
      [],
      ['CONFLICTING_CLAIM_ID'],
    ]);
  });

  it('never flags NULL claim IDs', () => {
    const rows = flagClaimIdConflicts([
      cleanRow(1, 'NULL', ['MISSING_CLAIM_ID']),
      cleanRow(2, 'NULL', ['MISSING_CLAIM_ID']),
    ]);
    expect(rows.map((r) => r.issues)).toEqual([['MISSING_CLAIM_ID'], ['MISSING_CLAIM_ID']]);
  });

  it('keeps issues in catalogue order after adding the code', () => {
    const [first] = flagClaimIdConflicts([
      cleanRow(1, 'A', ['NAME_CASING_FIXED', 'AMOUNT_ZERO']),
      cleanRow(2, 'A'),
    ]);
    expect(first.issues).toEqual(['CONFLICTING_CLAIM_ID', 'NAME_CASING_FIXED', 'AMOUNT_ZERO']);
  });

  it('does not change the input rows', () => {
    const input = [cleanRow(1, 'A'), cleanRow(2, 'A')];
    flagClaimIdConflicts(input);
    expect(input[0].issues).toEqual([]);
  });
});
