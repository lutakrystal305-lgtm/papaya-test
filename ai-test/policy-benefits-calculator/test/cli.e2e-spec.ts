import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';

import { CliModule } from '@/cli/cli.module';

const ROOT = join(__dirname, '..');
const SAMPLE_POLICY = join(ROOT, 'data/policy.sample.json');
const SAMPLE_EXPENSES = join(ROOT, 'data/expenses.sample.json');

describe('calc command (e2e)', () => {
  let commandModule: TestingModule;
  let outDir: string;
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  const run = (...args: string[]): Promise<void> =>
    CommandTestFactory.run(commandModule, ['calc', ...args]);
  const stderrText = (): string => stderr.mock.calls.map(([chunk]) => String(chunk)).join('');

  beforeEach(async () => {
    commandModule = await CommandTestFactory.createTestingCommand({
      imports: [CliModule],
    }).compile();
    outDir = await mkdtemp(join(tmpdir(), 'pbc-'));
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    process.exitCode = undefined;
    await rm(outDir, { recursive: true, force: true });
  });

  it('writes results.json and report.md and prints the report', async () => {
    await run('--policy', SAMPLE_POLICY, '--expenses', SAMPLE_EXPENSES, '--out', outDir);

    expect(process.exitCode).toBe(0);
    const results = JSON.parse(await readFile(join(outDir, 'results.json'), 'utf8'));
    const report = await readFile(join(outDir, 'report.md'), 'utf8');
    expect(results.results).toHaveLength(20);
    expect(report).toMatch(/^# Benefits Calculation/);
    expect(stdout).toHaveBeenCalledWith(report);
  });

  it('calculates the second policy without code changes (SC-006)', async () => {
    await run(
      '--policy',
      join(ROOT, 'data/policy.alt.json'),
      '--expenses',
      join(ROOT, 'data/expenses.alt.json'),
      '--out',
      outDir,
      '--quiet',
    );

    expect(process.exitCode).toBe(0);
    const results = JSON.parse(await readFile(join(outDir, 'results.json'), 'utf8'));
    expect(results.summary.policy_number).toBe('POL-2024-TH-INDV-0042');
  });

  it('does not print the report with --quiet', async () => {
    await run('--policy', SAMPLE_POLICY, '--expenses', SAMPLE_EXPENSES, '--out', outDir, '--quiet');

    expect(process.exitCode).toBe(0);
    expect(stdout).not.toHaveBeenCalledWith(expect.stringMatching(/^# Benefits Calculation/));
  });

  it('exits 1 and lists every policy error for an invalid policy', async () => {
    await run(
      '--policy',
      join(ROOT, 'test/fixtures/policy.invalid.json'),
      '--expenses',
      SAMPLE_EXPENSES,
      '--out',
      outDir,
    );

    expect(process.exitCode).toBe(1);
    expect(stderrText().trim().split('\n')).toHaveLength(5);
    expect(stderrText()).toContain('plan.expiry_date: must be after plan.effective_date');
    expect(existsSync(join(outDir, 'results.json'))).toBe(false);
  });

  it('exits 1 when expenses is not an array', async () => {
    await run(
      '--policy',
      SAMPLE_POLICY,
      '--expenses',
      join(ROOT, 'test/fixtures/expenses.not-array.json'),
      '--out',
      outDir,
    );

    expect(process.exitCode).toBe(1);
    expect(stderrText()).toContain('expenses must be an array');
  });

  it('exits 1 for a file that is not valid JSON', async () => {
    const broken = join(outDir, 'broken.json');
    await writeFile(broken, '{ not json');

    await run('--policy', broken, '--expenses', SAMPLE_EXPENSES, '--out', join(outDir, 'out'));

    expect(process.exitCode).toBe(1);
    expect(stderrText()).toContain('is not valid JSON');
    expect(existsSync(join(outDir, 'out'))).toBe(false);
  });

  it('exits 2 when a required option is missing', async () => {
    await run('--policy', SAMPLE_POLICY, '--out', outDir);

    expect(process.exitCode).toBe(2);
    expect(stderrText()).toContain('required option --expenses not specified');
    expect(stderrText()).toContain('usage: yarn calc');
  });

  it('exits 2 when an input file cannot be read', async () => {
    await run(
      '--policy',
      join(outDir, 'missing.json'),
      '--expenses',
      SAMPLE_EXPENSES,
      '--out',
      outDir,
    );

    expect(process.exitCode).toBe(2);
    expect(stderrText()).toContain('cannot read');
  });
});
