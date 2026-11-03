import type { CleanClaimRow, CleanupResult } from '../shared/types';
import { serializeCleanCsv, serializeDirtyCsv } from './csv-writer';

const HEADER =
  'claim_id,policy_id,member_name,claim_type,diagnosis,submitted_amount,currency,submitted_date,status,issues';

function row(
  overrides: Partial<CleanClaimRow['values']>,
  issues: CleanClaimRow['issues'] = [],
): CleanClaimRow {
  return {
    sourceRow: 1,
    values: {
      claim_id: 'CLM-1',
      policy_id: 'POL-1',
      member_name: 'John Doe',
      claim_type: 'OUTPATIENT',
      diagnosis: 'Flu',
      submitted_amount: '100',
      currency: 'THB',
      submitted_date: '2024-01-01',
      status: 'APPROVED',
      ...overrides,
    },
    issues,
    amountHundredths: 10000,
  };
}

const result = (rows: CleanClaimRow[]): CleanupResult => ({
  rowsBefore: rows.length,
  duplicates: [],
  rows,
});

describe('serializeCleanCsv', () => {
  it('writes the 9 columns plus issues as the header', () => {
    expect(serializeCleanCsv(result([])).split('\n')[0]).toBe(HEADER);
  });

  it('joins issues with | and leaves the field empty when there are none', () => {
    const lines = serializeCleanCsv(
      result([row({}, ['NAME_CASING_FIXED', 'AMOUNT_ZERO']), row({})]),
    ).split('\n');
    expect(lines[1]).toBe(
      'CLM-1,POL-1,John Doe,OUTPATIENT,Flu,100,THB,2024-01-01,APPROVED,NAME_CASING_FIXED|AMOUNT_ZERO',
    );
    expect(lines[2]).toBe('CLM-1,POL-1,John Doe,OUTPATIENT,Flu,100,THB,2024-01-01,APPROVED,');
  });

  it('quotes only values that contain a comma or quote', () => {
    const line = serializeCleanCsv(
      result([row({ member_name: 'Doe, John', diagnosis: 'say "hi"' })]),
    ).split('\n')[1];
    expect(line).toBe(
      'CLM-1,POL-1,"Doe, John",OUTPATIENT,"say ""hi""",100,THB,2024-01-01,APPROVED,',
    );
  });

  it('uses LF line endings and ends with a newline', () => {
    const text = serializeCleanCsv(result([row({})]));
    expect(text).not.toContain('\r');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('writes only the header for an empty result', () => {
    expect(serializeCleanCsv(result([]))).toBe(`${HEADER}\n`);
  });
});

describe('serializeDirtyCsv', () => {
  const values = row({
    submitted_amount: '15,000',
    submitted_date: 'March 15, 2024',
    diagnosis: '',
  }).values;

  it('writes exactly the 9 columns as the header', () => {
    expect(serializeDirtyCsv([values]).split('\n')[0]).toBe(HEADER.replace(',issues', ''));
  });

  it('quotes values with commas and writes empty values as empty fields', () => {
    expect(serializeDirtyCsv([values]).split('\n')[1]).toBe(
      'CLM-1,POL-1,John Doe,OUTPATIENT,,"15,000",THB,"March 15, 2024",APPROVED',
    );
  });

  it('uses LF line endings and ends with a newline', () => {
    const text = serializeDirtyCsv([values]);
    expect(text).not.toContain('\r');
    expect(text.endsWith('\n')).toBe(true);
  });
});
