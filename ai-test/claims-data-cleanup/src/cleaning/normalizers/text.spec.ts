import { normalizeWhitespace } from './text';

describe('normalizeWhitespace', () => {
  it('trims both ends', () => {
    expect(normalizeWhitespace('  Flu  ')).toBe('Flu');
  });

  it('collapses repeated spaces and tabs inside to one space', () => {
    expect(normalizeWhitespace('Somchai \t  Prasert')).toBe('Somchai Prasert');
  });

  it('leaves NULL unchanged', () => {
    expect(normalizeWhitespace('NULL')).toBe('NULL');
  });

  it('turns a blank value into an empty string', () => {
    expect(normalizeWhitespace('   ')).toBe('');
  });
});
