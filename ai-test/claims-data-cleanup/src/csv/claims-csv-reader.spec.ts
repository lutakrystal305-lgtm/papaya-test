import * as fs from 'node:fs';
import * as path from 'node:path';
import { InputFormatError } from '../shared/errors';
import { parseClaimsCsv } from './claims-csv-reader';

const fixture = (name: string): string =>
  fs.readFileSync(path.join(__dirname, '../../test/fixtures/input', name), 'utf8');

function detailsOf(text: string): string[] {
  try {
    parseClaimsCsv(text);
  } catch (error) {
    if (error instanceof InputFormatError) return error.details;
    throw error;
  }
  throw new Error('expected an InputFormatError');
}

describe('parseClaimsCsv', () => {
  it.each(['empty.csv', 'header-only.csv'])('returns no rows for %s', (name) => {
    expect(parseClaimsCsv(fixture(name))).toEqual([]);
  });

  it('names missing columns', () => {
    expect(detailsOf(fixture('missing-columns.csv'))).toContain(
      'missing columns: currency, status',
    );
  });

  it('names extra columns', () => {
    expect(detailsOf(fixture('extra-column.csv'))).toContain('unexpected columns: notes');
  });

  it('names repeated columns', () => {
    expect(detailsOf(fixture('duplicate-column.csv'))).toContain('repeated columns: status');
  });

  it('reports a row with the wrong number of values', () => {
    expect(detailsOf(fixture('wrong-width.csv'))).toEqual(['row 3 has 8 values, expected 9']);
  });

  it('maps reordered columns back to the standard order', () => {
    const rows = parseClaimsCsv(fixture('reordered-columns.csv'));
    expect(Object.keys(rows[0].values)).toEqual([
      'claim_id',
      'policy_id',
      'member_name',
      'claim_type',
      'diagnosis',
      'submitted_amount',
      'currency',
      'submitted_date',
      'status',
    ]);
    expect(rows[1].values).toMatchObject({ claim_id: 'CLM-2', currency: 'VND', status: 'PENDING' });
  });

  it('accepts a BOM, CRLF line endings, and header casing and spaces', () => {
    const rows = parseClaimsCsv(fixture('bom-crlf.csv'));
    expect(rows).toHaveLength(1);
    expect(rows[0].values.claim_id).toBe('CLM-1');
    expect(rows[0].values.status).toBe('APPROVED');
  });

  it('does not trim values', () => {
    const header =
      'claim_id,policy_id,member_name,claim_type,diagnosis,submitted_amount,currency,submitted_date,status';
    const [row] = parseClaimsCsv(`${header}\n" X ",P,N,T,D,1,THB,2024-01-01,APPROVED\n`);
    expect(row.values.claim_id).toBe(' X ');
  });

  it('numbers rows from 1 and reads a quoted comma as one value', () => {
    const header =
      'claim_id,policy_id,member_name,claim_type,diagnosis,submitted_amount,currency,submitted_date,status';
    const rows = parseClaimsCsv(
      `${header}\nA,P,N,T,D,"15,000",THB,"March 15, 2024",APPROVED\nB,P,N,T,D,1,THB,x,APPROVED\n`,
    );
    expect(rows.map((r) => r.sourceRow)).toEqual([1, 2]);
    expect(rows[0].values.submitted_amount).toBe('15,000');
    expect(rows[0].values.submitted_date).toBe('March 15, 2024');
  });

  it('reports unparseable CSV as an input error', () => {
    const header =
      'claim_id,policy_id,member_name,claim_type,diagnosis,submitted_amount,currency,submitted_date,status';
    expect(() => parseClaimsCsv(`${header}\n"unterminated,P,N,T,D,1,THB,x,APPROVED\n`)).toThrow(
      InputFormatError,
    );
  });
});
