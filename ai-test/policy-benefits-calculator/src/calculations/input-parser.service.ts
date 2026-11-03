import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidatorOptions } from 'class-validator';

import { Expense, InvalidExpense, ParsedExpense } from './interfaces/expense.interface';
import { Policy } from './interfaces/policy.interface';
import { PolicyFactory } from './policy/policy.factory';
import {
  DEFAULT_EXPENSE_DAYS,
  MAX_AMOUNT_MAJOR,
  MISSING_EXPENSE_ID,
} from './calculations.constants';
import {
  formatIssue,
  InputFormatError,
  PolicyIssue,
  PolicyValidationError,
} from './calculations.errors';
import { IsoDate } from './utils/iso-date';
import { Money } from './utils/money';
import { ExpenseDto } from './dto/expense.dto';
import { PolicyDto } from './dto/policy.dto';
import { toPolicyDraft } from './policy/policy-draft.mapper';
import { FieldError, flattenValidationErrors, isRecord } from './utils/validation-errors';

const VALIDATOR_OPTIONS: ValidatorOptions = { whitelist: true, forbidUnknownValues: true };
const POLICY_NOT_OBJECT = 'policy: must be an object';
const EXPENSE_NOT_OBJECT = 'expense: must be an object';
const EXPENSES_NOT_ARRAY = 'expenses must be an array';

const validate = (instance: object): FieldError[] =>
  flattenValidationErrors(validateSync(instance, VALIDATOR_OPTIONS));

const factoryIssues = (input: Record<string, unknown>): readonly PolicyIssue[] => {
  try {
    PolicyFactory.create(toPolicyDraft(input));
    return [];
  } catch (error) {
    if (error instanceof PolicyValidationError) {
      return error.issues;
    }
    throw error;
  }
};

const isRelated = (a: string, b: string): boolean =>
  a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);

// Keeps every DTO error plus PolicyFactory issues the DTO did not already report for the same field.
const mergeErrors = (fieldErrors: FieldError[], issues: readonly PolicyIssue[]): string[] => [
  ...fieldErrors.map(formatIssue),
  ...issues
    .filter(
      (issue) =>
        issue.kind === 'RULE' || !fieldErrors.some((error) => isRelated(error.path, issue.path)),
    )
    .map(formatIssue),
];

const optionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const submittedAmount = (value: unknown): Money =>
  typeof value === 'number' && value > 0 && value <= MAX_AMOUNT_MAJOR
    ? Money.fromMajor(value)
    : Money.zero();

const toInvalidExpense = (raw: Record<string, unknown>, reasons: string[]): InvalidExpense => ({
  invalid: true,
  expenseId: optionalText(raw.expense_id) ?? MISSING_EXPENSE_ID,
  date: optionalText(raw.date),
  benefitType: optionalText(raw.benefit_type),
  subBenefit: optionalText(raw.sub_benefit),
  submitted: submittedAmount(raw.amount),
  reasons,
});

const toExpense = (dto: ExpenseDto): Expense => ({
  expenseId: dto.expense_id,
  date: IsoDate.parse(dto.date),
  benefitType: dto.benefit_type,
  subBenefit: dto.sub_benefit,
  amount: Money.fromMajor(dto.amount),
  diagnosis: dto.diagnosis,
  provider: dto.provider,
  days: dto.days ?? DEFAULT_EXPENSE_DAYS,
});

const parseExpense = (item: unknown): ParsedExpense => {
  if (!isRecord(item)) {
    return toInvalidExpense({}, [EXPENSE_NOT_OBJECT]);
  }
  const dto = plainToInstance(ExpenseDto, item);
  const errors = validate(dto);
  return errors.length > 0 ? toInvalidExpense(item, errors.map(formatIssue)) : toExpense(dto);
};

@Injectable()
export class InputParserService {
  // Throws PolicyValidationError listing every issue.
  parsePolicy(input: unknown): Policy {
    if (!isRecord(input)) {
      throw new PolicyValidationError([POLICY_NOT_OBJECT]);
    }
    const fieldErrors = validate(plainToInstance(PolicyDto, input));
    if (fieldErrors.length === 0) {
      return PolicyFactory.create(toPolicyDraft(input));
    }
    throw new PolicyValidationError(mergeErrors(fieldErrors, factoryIssues(input)));
  }

  // Throws InputFormatError when the input is not an array; invalid items become InvalidExpense.
  parseExpenses(input: unknown): ParsedExpense[] {
    if (!Array.isArray(input)) {
      throw new InputFormatError(EXPENSES_NOT_ARRAY);
    }
    return input.map(parseExpense);
  }
}
