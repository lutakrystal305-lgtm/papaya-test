export const CLAIM_TYPES = ['OUTPATIENT', 'INPATIENT', 'DENTAL', 'MATERNITY'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

/** Keys are the raw value lowercased with everything except letters removed. */
export const CLAIM_TYPE_MAP: Readonly<Record<string, ClaimType>> = {
  outpatient: 'OUTPATIENT',
  outpateint: 'OUTPATIENT',
  outpatinet: 'OUTPATIENT',
  op: 'OUTPATIENT',
  opd: 'OUTPATIENT',
  inpatient: 'INPATIENT',
  inpateint: 'INPATIENT',
  ip: 'INPATIENT',
  ipd: 'INPATIENT',
  dental: 'DENTAL',
  dent: 'DENTAL',
  maternity: 'MATERNITY',
  maternty: 'MATERNITY',
  mat: 'MATERNITY',
};

export const CURRENCIES = ['THB', 'VND'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Keys are the raw value lowercased. */
export const CURRENCY_MAP: Readonly<Record<string, Currency>> = {
  thb: 'THB',
  baht: 'THB',
  '฿': 'THB',
  vnd: 'VND',
  dong: 'VND',
  đồng: 'VND',
  '₫': 'VND',
};

export const STATUSES = ['APPROVED', 'REJECTED', 'PENDING', 'IN_REVIEW'] as const;
export type Status = (typeof STATUSES)[number];

export const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export const MONTHS: Readonly<Record<string, number>> = Object.fromEntries(
  MONTH_NAMES.map((name, index) => [name, index + 1]),
);
