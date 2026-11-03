import { daysInMonth, formatIsoDate } from '../cleaning/normalizers/date';
import {
  CLAIM_ID_DIGITS,
  CLAIM_ID_PREFIX,
  DIAGNOSES,
  GENERATION_YEAR,
  MEMBER_NAMES,
  POLICY_IDS,
  THB_AMOUNT_MAX,
  THB_AMOUNT_MIN,
  THB_SHARE,
  VND_AMOUNT_MAX,
  VND_AMOUNT_MIN,
  VND_AMOUNT_STEP,
} from '../shared/constants/generator.constants';
import { CLAIM_TYPES, STATUSES } from '../shared/constants/mappings';
import type { Currency } from '../shared/constants/mappings';
import type { ClaimValues } from '../shared/types';
import type { Prng } from './prng';

const MONTHS_IN_YEAR = 12;

function dateFromDayOfYear(dayOfYear: number): string {
  let day = dayOfYear;
  let month = 1;
  while (month < MONTHS_IN_YEAR && day > daysInMonth(GENERATION_YEAR, month)) {
    day -= daysInMonth(GENERATION_YEAR, month);
    month += 1;
  }
  return formatIsoDate({ year: GENERATION_YEAR, month, day });
}

function daysInYear(): number {
  let total = 0;
  for (let month = 1; month <= MONTHS_IN_YEAR; month++)
    total += daysInMonth(GENERATION_YEAR, month);
  return total;
}

function amountFor(prng: Prng, currency: Currency): string {
  if (currency === 'THB') return String(prng.int(THB_AMOUNT_MIN, THB_AMOUNT_MAX));
  const steps = prng.int(VND_AMOUNT_MIN / VND_AMOUNT_STEP, VND_AMOUNT_MAX / VND_AMOUNT_STEP);
  return String(steps * VND_AMOUNT_STEP);
}

function buildRecord(prng: Prng, index: number, yearDays: number): ClaimValues {
  const currency: Currency = prng.next() < THB_SHARE ? 'THB' : 'VND';
  return {
    claim_id: `${CLAIM_ID_PREFIX}${String(index + 1).padStart(CLAIM_ID_DIGITS, '0')}`,
    policy_id: prng.pick(POLICY_IDS),
    member_name: prng.pick(MEMBER_NAMES),
    claim_type: prng.pick(CLAIM_TYPES),
    diagnosis: prng.pick(DIAGNOSES),
    submitted_amount: amountFor(prng, currency),
    currency,
    submitted_date: dateFromDayOfYear(prng.int(1, yearDays)),
    status: prng.pick(STATUSES),
  };
}

/** Clean claims with sequential IDs; every one passes the cleanup without issues. */
export function buildBaseRecords(prng: Prng, count: number): ClaimValues[] {
  const yearDays = daysInYear();
  return Array.from({ length: count }, (_, index) => buildRecord(prng, index, yearDays));
}
