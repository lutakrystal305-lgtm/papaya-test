import { CalculationOutput } from './interfaces/calculation-output.interface';
import { ReportRendererService } from './report-renderer.service';

const output: CalculationOutput = {
  results: [
    {
      expense_id: 'EXP-001',
      date: '2024-01-10',
      benefit_type: 'OUTPATIENT',
      sub_benefit: 'Doctor Visit',
      submitted_amount: 2500,
      covered_amount: 1200,
      copay_amount: 300,
      deductible_applied: 1000,
      member_pays: 1300,
      decision: 'PARTIALLY_COVERED',
      reason: 'Deductible applied | test.',
      remaining_annual_limit: 18800,
      remaining_visit_limit: 4,
    },
    {
      expense_id: 'BAD',
      date: null,
      benefit_type: null,
      sub_benefit: null,
      submitted_amount: 1234.5,
      covered_amount: 0,
      copay_amount: 0,
      deductible_applied: 0,
      member_pays: 1234.5,
      decision: 'DENIED',
      reason: 'Denied: invalid expense —\nbad date.',
      remaining_annual_limit: null,
      remaining_visit_limit: null,
    },
  ],
  summary: {
    policy_number: 'POL-1',
    currency: 'THB',
    expense_count: 2,
    totals: { submitted: 3734.5, covered: 1200, copay: 300, deductible: 1000, member_pays: 2534.5 },
    decisions: { COVERED: 0, PARTIALLY_COVERED: 1, DENIED: 1 },
    benefits: [
      {
        type: 'OUTPATIENT',
        limit_kind: 'ANNUAL',
        limit: 20000,
        used: 1200,
        remaining: 18800,
        deductible: { amount: 1000, used: 1000, remaining: 0 },
        sub_benefits: [
          {
            name: 'Doctor Visit',
            used: 1200,
            year_limit: null,
            visits: { limit: 5, used: 1, remaining: 4 },
            days: null,
          },
          {
            name: 'Tests',
            used: 0,
            year_limit: { limit: 6000, remaining: 6000 },
            visits: null,
            days: null,
          },
        ],
      },
      {
        type: 'INPATIENT',
        limit_kind: 'LIFETIME',
        limit: 50000,
        used: 0,
        remaining: 50000,
        deductible: null,
        sub_benefits: [
          {
            name: 'Room',
            used: 0,
            year_limit: null,
            visits: null,
            days: { limit: 10, used: 0, remaining: 10 },
          },
        ],
      },
    ],
  },
};

const EXPECTED = `# Benefits Calculation — POL-1

Currency: THB · Expenses: 2 · Covered: 0 · Partially covered: 1 · Denied: 1

## Expense decisions

| # | Expense | Date | Benefit | Submitted | Covered | Copay | Deductible | Member pays | Decision | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | EXP-001 | 2024-01-10 | OUTPATIENT / Doctor Visit | 2,500 | 1,200 | 300 | 1,000 | 1,300 | PARTIALLY_COVERED | Deductible applied \\| test. |
| 2 | BAD | — | — | 1,234.50 | 0 | 0 | 0 | 1,234.50 | DENIED | Denied: invalid expense — bad date. |

## Totals

| Submitted | Covered | Copay | Deductible | Member pays |
|---|---|---|---|---|
| 3,734.50 | 1,200 | 300 | 1,000 | 2,534.50 |

## Remaining balances

| Benefit | Limit | Used | Remaining | Deductible (used / remaining) |
|---|---|---|---|---|
| OUTPATIENT | 20,000 (annual) | 1,200 | 18,800 | 1,000 / 0 |
| INPATIENT | 50,000 (lifetime) | 0 | 50,000 | — |

| Benefit / Sub-benefit | Used | Year limit remaining | Visits (used / remaining) | Days (used / remaining) |
|---|---|---|---|---|
| OUTPATIENT / Doctor Visit | 1,200 | — | 1 / 4 | — |
| OUTPATIENT / Tests | 0 | 6,000 | — | — |
| INPATIENT / Room | 0 | — | — | 0 / 10 |
`;

describe('ReportRendererService', () => {
  it('renders the report layout from the contract', () => {
    expect(new ReportRendererService().render(output)).toBe(EXPECTED);
  });

  it('escapes user-supplied date text', () => {
    const report = new ReportRendererService().render({
      ...output,
      results: [{ ...output.results[1], date: 'a|b\n# injected' }],
    });
    expect(report).toContain('| 1 | BAD | a\\|b # injected | — |');
    expect(report).not.toMatch(/^# injected/m);
  });

  it('shows only the benefit type when the sub-benefit is missing', () => {
    const report = new ReportRendererService().render({
      ...output,
      results: [{ ...output.results[0], sub_benefit: null }],
    });
    expect(report).toContain('| 2024-01-10 | OUTPATIENT | 2,500 |');
  });
});
