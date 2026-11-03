import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv2020, { ValidateFunction } from 'ajv/dist/2020';

import { calculateBenefits } from '@/index';

const ROOT = join(__dirname, '..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

// strict: false allows the documentation-only "x-cross-field-rules" keyword.
const ajv = new Ajv2020({ allErrors: true, strict: false });
const schema = (name: string): ValidateFunction =>
  ajv.compile(readJson(`contracts/${name}.schema.json`) as object);

const policySchema = schema('policy');
const expensesSchema = schema('expenses');
const outputSchema = schema('calculation-output');

const expectValid = (validate: ValidateFunction, data: unknown): void => {
  const valid = validate(data);
  expect(validate.errors ?? []).toEqual([]);
  expect(valid).toBe(true);
};

describe('JSON Schema contracts', () => {
  it.each(['sample', 'alt'])('the %s policy matches policy.schema.json', (scenario) => {
    expectValid(policySchema, readJson(`data/policy.${scenario}.json`));
  });

  it.each(['sample', 'alt'])('the %s expenses match expenses.schema.json', (scenario) => {
    expectValid(expensesSchema, readJson(`data/expenses.${scenario}.json`));
  });

  it.each(['sample', 'alt'])(
    'the expected %s results match calculation-output.schema.json',
    (scenario) => {
      expectValid(outputSchema, readJson(`expected/${scenario}/results.json`));
    },
  );

  it('live library output matches calculation-output.schema.json', () => {
    const output = calculateBenefits(
      readJson('data/policy.sample.json'),
      readJson('test/fixtures/expenses.mixed.json'),
    );
    expectValid(outputSchema, output);
  });

  it('rejects a policy with both annual and lifetime limits', () => {
    const policy = readJson('data/policy.alt.json') as { benefits: Record<string, unknown>[] };
    policy.benefits[0] = { ...policy.benefits[0], lifetime_limit: 1000 };
    expect(policySchema(policy)).toBe(false);
  });
});
