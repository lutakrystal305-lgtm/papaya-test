import { titleCase } from './title-case';

describe('titleCase', () => {
  it.each(['JOHN DOE', 'john doe', 'jOHN dOE'])(
    'fixes %p to John Doe with the given code',
    (value) => {
      expect(titleCase(value, 'NAME_CASING_FIXED')).toEqual({
        value: 'John Doe',
        issues: ['NAME_CASING_FIXED'],
      });
    },
  );

  it('leaves a title-case value unchanged with no code', () => {
    expect(titleCase('John Doe', 'NAME_CASING_FIXED')).toEqual({ value: 'John Doe', issues: [] });
  });

  it('only capitalizes the first letter of each space-separated word (A-6)', () => {
    expect(titleCase('Mary-Jane', 'NAME_CASING_FIXED').value).toBe('Mary-jane');
  });

  it('returns the code it was given', () => {
    expect(titleCase('flu', 'DIAGNOSIS_CASING_FIXED').issues).toEqual(['DIAGNOSIS_CASING_FIXED']);
  });
});
