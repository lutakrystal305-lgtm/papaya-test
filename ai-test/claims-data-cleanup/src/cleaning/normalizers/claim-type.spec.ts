import { CLAIM_TYPE_MAP } from '../../shared/constants/mappings';
import { normalizeClaimType } from './claim-type';

describe('normalizeClaimType', () => {
  it.each(Object.entries(CLAIM_TYPE_MAP))('maps key %p to %p', (key, expected) => {
    expect(normalizeClaimType(key).value).toBe(expected);
  });

  it.each([
    ['Outpateint', 'OUTPATIENT'],
    ['OP', 'OUTPATIENT'],
    ['Out-Patient', 'OUTPATIENT'],
    [' ipd ', 'INPATIENT'],
    ['outpatient', 'OUTPATIENT'],
  ])('normalizes %p to %p with CLAIM_TYPE_NORMALIZED', (value, expected) => {
    expect(normalizeClaimType(value)).toEqual({
      value: expected,
      issues: ['CLAIM_TYPE_NORMALIZED'],
    });
  });

  it.each(['OUTPATIENT', 'INPATIENT', 'DENTAL', 'MATERNITY'])('leaves %p unchanged', (value) => {
    expect(normalizeClaimType(value)).toEqual({ value, issues: [] });
  });

  it.each(['Surgery', 'NULL'])('marks %p as unrecognized', (value) => {
    expect(normalizeClaimType(value)).toEqual({
      value: 'NULL',
      issues: ['CLAIM_TYPE_UNRECOGNIZED'],
    });
  });
});
