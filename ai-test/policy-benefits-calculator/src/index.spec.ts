import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  calculateBenefits,
  InputFormatError,
  PolicyValidationError,
  renderMarkdownReport,
} from './index';

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '..', path), 'utf8'));

describe('library API', () => {
  const policy = readJson('data/policy.sample.json');
  const expenses = readJson('data/expenses.sample.json');

  it('calculates without Nest dependency injection', () => {
    const output = calculateBenefits(policy, expenses);
    expect(output.results).toHaveLength(20);
    expect(output.summary.totals).toEqual({
      submitted: 124000,
      covered: 90600,
      copay: 4600,
      deductible: 1000,
      member_pays: 33400,
    });
  });

  it('throws PolicyValidationError for an invalid policy', () => {
    expect(() =>
      calculateBenefits(readJson('test/fixtures/policy.invalid.json'), expenses),
    ).toThrow(PolicyValidationError);
  });

  it('throws InputFormatError when expenses is not an array', () => {
    expect(() => calculateBenefits(policy, {})).toThrow(InputFormatError);
  });

  it('returns full balances for an empty expense list', () => {
    const output = calculateBenefits(policy, []);
    expect(output.results).toEqual([]);
    expect(output.summary.benefits[1].remaining).toBe(20000);
  });

  it('renders the Markdown report', () => {
    expect(renderMarkdownReport(calculateBenefits(policy, expenses))).toMatch(
      /^# Benefits Calculation — POL-2024-TH-00789\n/,
    );
  });
});
