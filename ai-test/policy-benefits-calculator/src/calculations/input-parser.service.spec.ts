import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { InputFormatError, PolicyValidationError } from './calculations.errors';
import { isInvalid } from './interfaces/expense.interface';
import { InputParserService } from './input-parser.service';

const ROOT = join(__dirname, '../..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

const policyErrors = (input: unknown): readonly string[] => {
  try {
    new InputParserService().parsePolicy(input);
  } catch (error) {
    if (error instanceof PolicyValidationError) {
      return error.errors;
    }
    throw error;
  }
  throw new Error('expected PolicyValidationError');
};

const samplePolicyJson = (): Record<string, unknown> =>
  readJson('data/policy.sample.json') as Record<string, unknown>;

describe('InputParserService', () => {
  const parser = new InputParserService();

  describe('parsePolicy', () => {
    it('parses the sample policy', () => {
      const policy = parser.parsePolicy(samplePolicyJson());
      expect(policy.policyNumber).toBe('POL-2024-TH-00789');
      expect(policy.benefits.map((benefit) => benefit.type)).toEqual([
        'INPATIENT',
        'OUTPATIENT',
        'DENTAL',
        'MATERNITY',
      ]);
      expect(policy.exclusions).toHaveLength(3);
      expect(policy.benefits[1].subBenefits[1].copay?.fixedPerVisit?.toMajor()).toBe(200);
    });

    it('US4-AS3: reports every structural and cross-field error together', () => {
      const errors = policyErrors(readJson('test/fixtures/policy.invalid.json'));
      expect(errors).toEqual([
        'benefits.1.annual_limit: must be a positive number',
        'benefits.1.copay.percentage: must not be greater than 100',
        'plan.expiry_date: must be after plan.effective_date',
        'benefits.0: exactly one of annual_limit or lifetime_limit is required',
      ]);
    });

    it('does not report the same field twice when its type is wrong', () => {
      const policy = samplePolicyJson();
      const benefits = policy.benefits as Record<string, unknown>[];
      benefits[0] = { ...benefits[0], annual_limit: 'abc' };
      expect(policyErrors({ ...policy, benefits })).toEqual([
        'benefits.0.annual_limit: must be a positive number',
      ]);
    });

    it('rejects a date that does not exist', () => {
      const policy = samplePolicyJson();
      const plan = { ...(policy.plan as object), effective_date: '2024-02-30' };
      expect(policyErrors({ ...policy, plan })).toEqual([
        'plan.effective_date: must be a valid YYYY-MM-DD date',
      ]);
    });

    it('reports missing sections', () => {
      expect(policyErrors({ policy_number: 'P' })).toEqual([
        'plan: must be an object',
        'benefits: must contain at least 1 elements',
        'benefits: must be an array',
      ]);
    });

    it.each([[[]], ['policy'], [null]])('rejects a policy that is not an object: %p', (input) => {
      expect(policyErrors(input)).toEqual(['policy: must be an object']);
    });

    it('ignores unknown fields such as Challenge 05 metadata', () => {
      const policy = parser.parsePolicy({
        ...samplePolicyJson(),
        policyholder: { name: 'Acme' },
        network: {},
      });
      expect(policy.policyNumber).toBe('POL-2024-TH-00789');
    });
  });

  describe('parseExpenses', () => {
    it('rejects input that is not an array', () => {
      expect(() => parser.parseExpenses({})).toThrow(
        new InputFormatError('expenses must be an array'),
      );
    });

    it('validates each expense separately', () => {
      const parsed = parser.parseExpenses(readJson('test/fixtures/expenses.mixed.json'));

      expect(parsed.map((item) => isInvalid(item))).toEqual([false, true, true, false]);
      expect(parsed[1]).toMatchObject({
        expenseId: 'MIX-002',
        reasons: ['amount: must be a positive number'],
      });
      expect(isInvalid(parsed[1]) && parsed[1].submitted.isZero()).toBe(true);
      expect(parsed[2]).toMatchObject({
        expenseId: 'MIX-003',
        date: '2024-02-30',
        reasons: ['date: must be a valid YYYY-MM-DD date'],
      });
      expect(isInvalid(parsed[2]) && parsed[2].submitted.toMajor()).toBe(1200);
    });

    it('maps a valid expense to the calculator model', () => {
      const [first] = parser.parseExpenses(readJson('data/expenses.sample.json'));
      if (isInvalid(first)) {
        throw new Error('expected a valid expense');
      }
      expect(first).toMatchObject({
        expenseId: 'EXP-001',
        benefitType: 'OUTPATIENT',
        subBenefit: 'Doctor Visit',
        days: 1,
      });
      expect(first.date.toString()).toBe('2024-01-10');
      expect(first.amount.toMajor()).toBe(2500);
    });

    it('keeps the number of days for per-day benefits', () => {
      const parsed = parser.parseExpenses(readJson('data/expenses.sample.json'));
      expect(parsed.find((item) => item.expenseId === 'EXP-006')).toMatchObject({ days: 5 });
    });

    it('denies oversized amounts and days without failing the other expenses', () => {
      const [valid] = readJson('data/expenses.sample.json') as Record<string, unknown>[];
      const parsed = parser.parseExpenses([
        { ...valid, expense_id: 'BIG-AMOUNT', amount: 1e20 },
        { ...valid, expense_id: 'BIG-BAD-DATE', amount: 1e20, date: 'bad' },
        { ...valid, expense_id: 'BIG-DAYS', days: 1e13 },
        valid,
      ]);

      expect(parsed.map((item) => isInvalid(item))).toEqual([true, true, true, false]);
      expect(parsed[0]).toMatchObject({
        reasons: ['amount: must not be greater than 100000000000'],
      });
      expect(isInvalid(parsed[1]) && parsed[1].submitted.isZero()).toBe(true);
      expect(parsed[2]).toMatchObject({ reasons: ['days: must not be greater than 366'] });
    });

    it('rejects an oversized policy limit as a policy error', () => {
      const policy = samplePolicyJson();
      const benefits = policy.benefits as Record<string, unknown>[];
      benefits[0] = { ...benefits[0], annual_limit: 1e20 };
      expect(policyErrors({ ...policy, benefits })).toEqual([
        'benefits.0.annual_limit: Money must not exceed 100000000000, got 100000000000000000000',
      ]);
    });

    it('denies an item that is not an object', () => {
      const [item] = parser.parseExpenses([42]);
      expect(item).toMatchObject({
        invalid: true,
        expenseId: '<missing>',
        date: null,
        reasons: ['expense: must be an object'],
      });
    });
  });
});
