import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCli } from '../src/cli/run-cli';
import { captureIo } from './helpers/capture-io';
import { FIXTURES, readFixture } from './helpers/fixtures';
import { listFilesRecursive, makeTempDir, removeTempDir } from './helpers/temp-dir';

let cwd: string;

beforeEach(() => {
  cwd = makeTempDir();
});

afterEach(() => removeTempDir(cwd));

describe('usage', () => {
  it('prints usage and exits 0 for --help', async () => {
    const cap = captureIo(cwd);
    expect(await runCli(['--help'], cap.io)).toBe(0);
    expect(cap.stdout()).toContain('Usage:');
  });

  it('exits 2 with an error and usage when no command is given', async () => {
    const cap = captureIo(cwd);
    expect(await runCli([], cap.io)).toBe(2);
    expect(cap.stderr()).toMatch(/^error: missing command\n/);
    expect(cap.stderr()).toContain('Usage:');
  });

  it.each([[['bogus']], [['clean', '--bogus']], [['generate', '--seed', 'abc']]])(
    'exits 2 for %p and writes no files',
    async (argv) => {
      const cap = captureIo(cwd);
      expect(await runCli(argv, cap.io)).toBe(2);
      expect(cap.stderr()).toMatch(/^error: /);
      expect(listFilesRecursive(cwd)).toEqual([]);
    },
  );
});

describe('clean', () => {
  const fixturePath = (name: string): string => path.join(FIXTURES, name);

  it('writes the clean CSV and exits 0', async () => {
    const cap = captureIo(cwd);
    const code = await runCli(
      ['clean', '--in', fixturePath('all-issues.dirty.csv'), '--out', 'out/clean.csv'],
      cap.io,
    );
    expect(code).toBe(0);
    expect(fs.readFileSync(path.join(cwd, 'out/clean.csv'), 'utf8')).toBe(
      readFixture('all-issues.expected-clean.csv'),
    );
  });

  it('exits 1 and writes nothing when the input file is missing', async () => {
    const cap = captureIo(cwd);
    expect(await runCli(['clean', '--in', 'nope.csv'], cap.io)).toBe(1);
    expect(cap.stderr()).toMatch(/^error: /);
    expect(listFilesRecursive(cwd)).toEqual([]);
  });

  it('exits 1, names missing columns, and writes nothing', async () => {
    const cap = captureIo(cwd);
    const code = await runCli(['clean', '--in', fixturePath('input/missing-columns.csv')], cap.io);
    expect(code).toBe(1);
    expect(cap.stderr()).toContain('missing columns: currency, status');
    expect(listFilesRecursive(cwd)).toEqual([]);
  });

  it('writes a header-only clean CSV for an empty input', async () => {
    const cap = captureIo(cwd);
    const code = await runCli(
      ['clean', '--in', fixturePath('input/empty.csv'), '--out', 'clean.csv'],
      cap.io,
    );
    expect(code).toBe(0);
    expect(fs.readFileSync(path.join(cwd, 'clean.csv'), 'utf8')).toBe(
      'claim_id,policy_id,member_name,claim_type,diagnosis,submitted_amount,currency,submitted_date,status,issues\n',
    );
  });

  it('writes both reports and prints the Markdown report', async () => {
    const cap = captureIo(cwd);
    const code = await runCli(
      [
        'clean',
        '--in',
        fixturePath('all-issues.dirty.csv'),
        '--out',
        'out/clean.csv',
        '--report',
        'out/r.md',
        '--report-json',
        'out/r.json',
      ],
      cap.io,
    );
    expect(code).toBe(0);
    expect(cap.stdout()).toBe(fs.readFileSync(path.join(cwd, 'out/r.md'), 'utf8'));
    const expected: unknown = JSON.parse(readFixture('all-issues.expected-report.json'));
    expect(fs.readFileSync(path.join(cwd, 'out/r.json'), 'utf8')).toBe(
      JSON.stringify(expected, null, 2) + '\n',
    );
  });

  it('reports all zero counts for an empty input', async () => {
    const cap = captureIo(cwd);
    await runCli(
      ['clean', '--in', fixturePath('input/empty.csv'), '--report-json', 'r.json'],
      cap.io,
    );
    const report = JSON.parse(fs.readFileSync(path.join(cwd, 'r.json'), 'utf8')) as {
      row_counts: Record<string, number>;
    };
    expect(report.row_counts).toEqual({ before: 0, duplicates_removed: 0, after: 0 });
  });

  it('writes none of the 3 output files when the input is invalid', async () => {
    const cap = captureIo(cwd);
    await runCli(['clean', '--in', fixturePath('input/wrong-width.csv')], cap.io);
    expect(listFilesRecursive(cwd)).toEqual([]);
  });
});

describe('generate and all', () => {
  const read = (file: string): string => fs.readFileSync(path.join(cwd, file), 'utf8');

  it('writes the dirty CSV and issue log to the default paths', async () => {
    const cap = captureIo(cwd);
    expect(await runCli(['generate'], cap.io)).toBe(0);
    expect(listFilesRecursive(cwd)).toEqual([
      'data/claims_dirty.csv',
      'data/claims_dirty.issues.json',
    ]);
    expect(cap.stdout()).toBe(
      'Generated 500 rows (86 with issues, 15 with multiple) → data/claims_dirty.csv (seed 42)\n',
    );
  });

  it('writes identical files for the same seed', async () => {
    await runCli(
      ['generate', '--seed', '7', '--out', 'a.csv', '--log', 'a.json'],
      captureIo(cwd).io,
    );
    await runCli(
      ['generate', '--seed', '7', '--out', 'b.csv', '--log', 'b.json'],
      captureIo(cwd).io,
    );
    expect(read('a.csv')).toBe(read('b.csv'));
    expect(read('a.json')).toBe(read('b.json'));
  });

  it('writes all 5 files and prints the generate line, a blank line, and the report', async () => {
    const cap = captureIo(cwd);
    expect(await runCli(['all'], cap.io)).toBe(0);
    expect(listFilesRecursive(cwd)).toEqual([
      'data/claims_dirty.csv',
      'data/claims_dirty.issues.json',
      'output/claims_clean.csv',
      'output/report.json',
      'output/report.md',
    ]);
    expect(cap.stdout()).toBe(
      `Generated 500 rows (86 with issues, 15 with multiple) → data/claims_dirty.csv (seed 42)\n\n${read('output/report.md')}`,
    );
  });

  it('writes the dirty CSV to --in and cleans that file', async () => {
    const cap = captureIo(cwd);
    expect(await runCli(['all', '--in', 'custom/dirty.csv'], cap.io)).toBe(0);
    expect(fs.existsSync(path.join(cwd, 'custom/dirty.csv'))).toBe(true);
    expect(read('output/report.md')).toContain('Source: `dirty.csv`');
  });
});
