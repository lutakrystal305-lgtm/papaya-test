// Every human-readable reason fragment lives here (research.md R-10). Amounts arrive pre-formatted.
export const ReasonTemplates = {
  notCovered: (type: string, subBenefit: string): string =>
    `Denied: ${type} / ${subBenefit} is not covered by this policy.`,
  outsidePolicyPeriod: (date: string, from: string, to: string): string =>
    `Denied: expense date ${date} is outside the policy period ${from} to ${to}.`,
  excluded: (label: string, term: string): string =>
    `Denied: excluded condition "${label}" (matched "${term}").`,
  waitingPeriod: (type: string, days: number, endDate: string, remaining: number): string =>
    `Denied: ${type} waiting period of ${days} days ends ${endDate} (${remaining} days remaining).`,
  visitsExhausted: (subBenefit: string, used: number, limit: number): string =>
    `Denied: ${subBenefit} visit limit exhausted (${used} of ${limit} visits used).`,
  daysExhausted: (subBenefit: string, used: number, limit: number): string =>
    `Denied: ${subBenefit} day limit exhausted (${used} of ${limit} days used).`,
  limitExhausted: (limitName: string, limit: string): string =>
    `Denied: ${limitName} exhausted (${limit} of ${limit} used).`,
  perExpenseCap: (label: string, cap: string, notCovered: string): string =>
    `${label} limit ${cap} applied; ${notCovered} not covered.`,
  perDayCap: (daily: string, days: number, total: string, notCovered: string): string =>
    `Per-day limit ${daily} × ${days} days = ${total} applied; ${notCovered} not covered.`,
  deductible: (applied: string, remaining: string): string =>
    `Deductible applied: ${applied} (${remaining} deductible remaining).`,
  deductibleOnly: (applied: string, remaining: string): string =>
    `Denied: amount applied to deductible: ${applied} (${remaining} deductible remaining); nothing payable.`,
  percentageCopay: (percentage: number, copay: string): string =>
    `${percentage}% copay applied: ${copay}.`,
  cappedPercentageCopay: (percentage: number, cap: string, copay: string): string =>
    `${percentage}% copay applied, capped at ${cap} per visit: ${copay}.`,
  fixedCopay: (copay: string): string => `Fixed copay applied: ${copay}.`,
  limitBound: (limitName: string, remaining: string, excess: string): string =>
    `Covered amount limited by remaining ${limitName} (${remaining}); ${excess} above limit.`,
  subBenefitLimitName: (subBenefit: string): string => `${subBenefit} annual sub-limit`,
  benefitLimitName: (type: string, kind: string): string => `${type} ${kind.toLowerCase()} limit`,
  summary: (covered: string, memberPays: string): string =>
    `Covered: ${covered}. Member pays: ${memberPays}.`,
  fullyCovered: (amount: string): string => `Fully covered: ${amount}.`,
  invalidExpense: (reasons: readonly string[]): string =>
    `Denied: invalid expense — ${reasons.join('; ')}.`,
  duplicateExpense: (expenseId: string): string =>
    `Denied: duplicate expense_id "${expenseId}" (already processed in this run).`,
} as const;

export const CAP_LABELS = {
  PER_VISIT: 'Per-visit',
  PER_EVENT: 'Per-event',
} as const;
