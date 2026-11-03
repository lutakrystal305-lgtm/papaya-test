import { parseCliArgs, UsageError } from './args';

describe('parseCliArgs', () => {
  it.each([['--help'], ['-h'], ['clean', '--help'], ['all', '-h']])(
    'returns help for %p',
    (...argv) => {
      expect(parseCliArgs(argv)).toEqual({ kind: 'help' });
    },
  );

  it('rejects a missing command', () => {
    expect(() => parseCliArgs([])).toThrow(new UsageError('missing command'));
  });

  it('rejects an unknown command', () => {
    expect(() => parseCliArgs(['bogus'])).toThrow(UsageError);
  });

  it('rejects an unknown option', () => {
    expect(() => parseCliArgs(['clean', '--bogus'])).toThrow(UsageError);
  });

  it('rejects an option that does not belong to the command', () => {
    expect(() => parseCliArgs(['generate', '--report', 'x'])).toThrow(UsageError);
  });

  it('rejects extra positional arguments', () => {
    expect(() => parseCliArgs(['clean', 'extra'])).toThrow(UsageError);
  });

  it.each(['0', '4294967295'])('accepts seed %s', (seed) => {
    const parsed = parseCliArgs(['generate', '--seed', seed]);
    expect(parsed).toMatchObject({ kind: 'run', options: { seed: Number(seed) } });
  });

  it.each(['-1', '4294967296', '1.5', 'abc', ''])('rejects seed %p', (seed) => {
    expect(() => parseCliArgs(['generate', `--seed=${seed}`])).toThrow(UsageError);
  });

  it('applies the generate defaults', () => {
    expect(parseCliArgs(['generate'])).toEqual({
      kind: 'run',
      command: 'generate',
      options: { seed: 42, out: 'data/claims_dirty.csv', log: 'data/claims_dirty.issues.json' },
    });
  });

  it('applies the clean defaults', () => {
    expect(parseCliArgs(['clean'])).toEqual({
      kind: 'run',
      command: 'clean',
      options: {
        in: 'data/claims_dirty.csv',
        out: 'output/claims_clean.csv',
        report: 'output/report.md',
        reportJson: 'output/report.json',
      },
    });
  });

  it('applies the all defaults', () => {
    expect(parseCliArgs(['all'])).toEqual({
      kind: 'run',
      command: 'all',
      options: {
        seed: 42,
        in: 'data/claims_dirty.csv',
        log: 'data/claims_dirty.issues.json',
        out: 'output/claims_clean.csv',
        report: 'output/report.md',
        reportJson: 'output/report.json',
      },
    });
  });

  it('uses --in of all as both the dirty CSV path and the cleanup input', () => {
    expect(parseCliArgs(['all', '--in', 'custom/dirty.csv'])).toMatchObject({
      options: { in: 'custom/dirty.csv' },
    });
  });
});
