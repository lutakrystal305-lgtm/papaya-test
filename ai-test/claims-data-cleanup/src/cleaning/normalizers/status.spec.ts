import { normalizeStatus } from './status';

describe('normalizeStatus', () => {
  it.each(['APPROVED', 'REJECTED', 'PENDING', 'IN_REVIEW'])('leaves %p unchanged', (value) => {
    expect(normalizeStatus(value)).toEqual({ value, issues: [] });
  });

  it.each([
    ['approved', 'APPROVED'],
    ['in review', 'IN_REVIEW'],
    ['In-Review', 'IN_REVIEW'],
    ['in_review', 'IN_REVIEW'],
  ])('maps %p to %p with STATUS_NORMALIZED', (value, expected) => {
    expect(normalizeStatus(value)).toEqual({ value: expected, issues: ['STATUS_NORMALIZED'] });
  });

  it('marks CLOSED as unrecognized', () => {
    expect(normalizeStatus('CLOSED')).toEqual({ value: 'NULL', issues: ['STATUS_UNRECOGNIZED'] });
  });
});
