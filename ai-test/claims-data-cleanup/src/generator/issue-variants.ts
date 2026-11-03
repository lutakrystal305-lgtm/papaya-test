import type { ClaimColumn } from '../shared/constants/columns';
import { COMMA_AMOUNT_MIN } from '../shared/constants/generator.constants';
import { MONTH_NAMES } from '../shared/constants/mappings';
import type { ClaimValues, IssueCode } from '../shared/types';

export interface IssueVariant {
  id: string;
  column: ClaimColumn;
  expectedCodes: IssueCode[];
  appliesTo(record: ClaimValues): boolean;
  apply(record: ClaimValues): ClaimValues;
}

const always = (): boolean => true;
const when =
  (column: ClaimColumn, value: string) =>
  (record: ClaimValues): boolean =>
    record[column] === value;

function variant(
  id: string,
  column: ClaimColumn,
  code: IssueCode,
  write: (value: string) => string,
  appliesTo: (record: ClaimValues) => boolean = always,
): IssueVariant {
  return {
    id,
    column,
    expectedCodes: [code],
    appliesTo,
    apply: (record) => ({ ...record, [column]: write(record[column]) }),
  };
}

const constant = (value: string) => (): string => value;

function withThousandSeparators(amount: string): string {
  return amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function isoToDayMonthYear(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function isoToMonthName(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const name = MONTH_NAMES[month - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${day}, ${year}`;
}

/** The 21 variants from research R-08, in R-08 order. */
export const ISSUE_VARIANTS: readonly IssueVariant[] = [
  variant('claim_id:missing', 'claim_id', 'MISSING_CLAIM_ID', constant('')),
  variant('policy_id:missing', 'policy_id', 'MISSING_POLICY_ID', constant('')),
  variant('member_name:upper', 'member_name', 'NAME_CASING_FIXED', (v) => v.toUpperCase()),
  variant('member_name:lower', 'member_name', 'NAME_CASING_FIXED', (v) => v.toLowerCase()),
  variant(
    'claim_type:outpatient',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('outpatient'),
    when('claim_type', 'OUTPATIENT'),
  ),
  variant(
    'claim_type:Outpateint',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('Outpateint'),
    when('claim_type', 'OUTPATIENT'),
  ),
  variant(
    'claim_type:OP',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('OP'),
    when('claim_type', 'OUTPATIENT'),
  ),
  variant(
    'claim_type:inpatient',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('inpatient'),
    when('claim_type', 'INPATIENT'),
  ),
  variant(
    'claim_type:IP',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('IP'),
    when('claim_type', 'INPATIENT'),
  ),
  variant(
    'claim_type:dental',
    'claim_type',
    'CLAIM_TYPE_NORMALIZED',
    constant('dental'),
    when('claim_type', 'DENTAL'),
  ),
  variant('diagnosis:empty', 'diagnosis', 'MISSING_DIAGNOSIS', constant('')),
  variant('diagnosis:N/A', 'diagnosis', 'MISSING_DIAGNOSIS', constant('N/A')),
  variant('diagnosis:n/a', 'diagnosis', 'MISSING_DIAGNOSIS', constant('n/a')),
  variant('amount:negative', 'submitted_amount', 'AMOUNT_NEGATIVE', (v) => `-${v}`),
  variant('amount:zero', 'submitted_amount', 'AMOUNT_ZERO', constant('0')),
  variant(
    'amount:comma',
    'submitted_amount',
    'AMOUNT_REFORMATTED',
    withThousandSeparators,
    (r) => Number(r.submitted_amount) >= COMMA_AMOUNT_MIN,
  ),
  variant(
    'currency:thb',
    'currency',
    'CURRENCY_NORMALIZED',
    constant('thb'),
    when('currency', 'THB'),
  ),
  variant(
    'currency:Baht',
    'currency',
    'CURRENCY_NORMALIZED',
    constant('Baht'),
    when('currency', 'THB'),
  ),
  variant(
    'currency:vnd',
    'currency',
    'CURRENCY_NORMALIZED',
    constant('vnd'),
    when('currency', 'VND'),
  ),
  variant('date:dd/mm/yyyy', 'submitted_date', 'DATE_REFORMATTED', isoToDayMonthYear),
  variant('date:month-name', 'submitted_date', 'DATE_REFORMATTED', isoToMonthName),
];

export function variantById(id: string): IssueVariant {
  const found = ISSUE_VARIANTS.find((v) => v.id === id);
  if (!found) throw new Error(`unknown issue variant ${id}`);
  return found;
}
