import { Injectable } from '@nestjs/common';

import {
  BenefitSummaryOutput,
  CalculationOutput,
  ExpenseResultOutput,
  RunSummaryOutput,
} from './interfaces/calculation-output.interface';

const EMPTY = '—';
const FRACTION_DIGITS = 2;
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fractionFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: FRACTION_DIGITS,
  maximumFractionDigits: FRACTION_DIGITS,
});

const amount = (value: number): string =>
  (Number.isInteger(value) ? wholeFormatter : fractionFormatter).format(value);

const cell = (value: string): string => value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');

const row = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;

const table = (headers: readonly string[], rows: readonly string[][]): string[] => [
  row(headers),
  `|${headers.map(() => '---').join('|')}|`,
  ...rows.map(row),
];

const usedOfRemaining = (counter: { used: number; remaining: number } | null): string =>
  counter ? `${amount(counter.used)} / ${amount(counter.remaining)}` : EMPTY;

const benefitLabel = (result: ExpenseResultOutput): string => {
  if (result.benefit_type === null) {
    return EMPTY;
  }
  return result.sub_benefit === null
    ? result.benefit_type
    : `${result.benefit_type} / ${result.sub_benefit}`;
};

const decisionRow = (result: ExpenseResultOutput, index: number): string[] => [
  String(index + 1),
  cell(result.expense_id),
  cell(result.date ?? EMPTY),
  cell(benefitLabel(result)),
  amount(result.submitted_amount),
  amount(result.covered_amount),
  amount(result.copay_amount),
  amount(result.deductible_applied),
  amount(result.member_pays),
  result.decision,
  cell(result.reason),
];

const benefitRow = (benefit: BenefitSummaryOutput): string[] => [
  cell(benefit.type),
  `${amount(benefit.limit)} (${benefit.limit_kind.toLowerCase()})`,
  amount(benefit.used),
  amount(benefit.remaining),
  usedOfRemaining(benefit.deductible),
];

const subBenefitRows = (benefit: BenefitSummaryOutput): string[][] =>
  benefit.sub_benefits.map((sub) => [
    cell(`${benefit.type} / ${sub.name}`),
    amount(sub.used),
    sub.year_limit ? amount(sub.year_limit.remaining) : EMPTY,
    usedOfRemaining(sub.visits),
    usedOfRemaining(sub.days),
  ]);

const header = (summary: RunSummaryOutput): string[] => [
  `# Benefits Calculation — ${summary.policy_number}`,
  '',
  `Currency: ${summary.currency} · Expenses: ${summary.expense_count} · Covered: ${summary.decisions.COVERED} · ` +
    `Partially covered: ${summary.decisions.PARTIALLY_COVERED} · Denied: ${summary.decisions.DENIED}`,
];

const totals = ({ totals: t }: RunSummaryOutput): string[] =>
  table(
    ['Submitted', 'Covered', 'Copay', 'Deductible', 'Member pays'],
    [[t.submitted, t.covered, t.copay, t.deductible, t.member_pays].map(amount)],
  );

const balances = (summary: RunSummaryOutput): string[] => [
  ...table(
    ['Benefit', 'Limit', 'Used', 'Remaining', 'Deductible (used / remaining)'],
    summary.benefits.map(benefitRow),
  ),
  '',
  ...table(
    [
      'Benefit / Sub-benefit',
      'Used',
      'Year limit remaining',
      'Visits (used / remaining)',
      'Days (used / remaining)',
    ],
    summary.benefits.flatMap(subBenefitRows),
  ),
];

const DECISION_HEADERS = [
  '#',
  'Expense',
  'Date',
  'Benefit',
  'Submitted',
  'Covered',
  'Copay',
  'Deductible',
  'Member pays',
  'Decision',
  'Reason',
];

@Injectable()
export class ReportRendererService {
  render({ results, summary }: CalculationOutput): string {
    const lines = [
      ...header(summary),
      '',
      '## Expense decisions',
      '',
      ...table(DECISION_HEADERS, results.map(decisionRow)),
      '',
      '## Totals',
      '',
      ...totals(summary),
      '',
      '## Remaining balances',
      '',
      ...balances(summary),
    ];
    return `${lines.join('\n')}\n`;
  }
}
