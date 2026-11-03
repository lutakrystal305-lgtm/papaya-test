import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Test, TestingModule } from '@nestjs/testing';

import { CalculationOutput } from '@/calculations/interfaces/calculation-output.interface';
import { CalculationsModule } from '@/calculations/calculations.module';
import { CalculationsService } from '@/calculations/calculations.service';

const ROOT = join(__dirname, '..');
const readJson = <T = unknown>(path: string): T =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as T;

const withoutReasons = (output: CalculationOutput): CalculationOutput => ({
  ...output,
  results: output.results.map((result) => ({ ...result, reason: '' })),
});

const JSON_INDENT = 2;

describe.each(['sample', 'alt'])('golden: %s scenario (e2e)', (scenario) => {
  let moduleRef: TestingModule;
  let output: CalculationOutput;
  let report: string;
  const expected = readJson<CalculationOutput>(`expected/${scenario}/results.json`);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [CalculationsModule] }).compile();
    await moduleRef.init();
    ({ output, report } = moduleRef
      .get(CalculationsService)
      .calculate(
        readJson(`data/policy.${scenario}.json`),
        readJson(`data/expenses.${scenario}.json`),
      ));
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('matches the hand-calculated amounts, decisions and balances', () => {
    expect(withoutReasons(output)).toEqual(withoutReasons(expected));
  });

  it('explains every decision', () => {
    output.results.forEach((result) => expect(result.reason.length).toBeGreaterThan(0));
  });

  // Reasons and report.md were approved after review against sample-scenario.md (T069).
  it('produces byte-identical results.json and report.md', () => {
    const text = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
    expect(`${JSON.stringify(output, null, JSON_INDENT)}\n`).toBe(
      text(`expected/${scenario}/results.json`),
    );
    expect(report).toBe(text(`expected/${scenario}/report.md`));
  });
});
