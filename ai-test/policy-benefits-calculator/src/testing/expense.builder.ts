import { Expense } from '../calculations/interfaces/expense.interface';
import { DEFAULT_EXPENSE_DAYS } from '../calculations/calculations.constants';
import { IsoDate } from '../calculations/utils/iso-date';
import { Money } from '../calculations/utils/money';

export interface ExpenseInput {
  id?: string;
  date?: string;
  type?: string;
  sub?: string;
  amount?: number;
  diagnosis?: string;
  provider?: string;
  days?: number;
}

export const expense = (input: ExpenseInput = {}): Expense => ({
  expenseId: input.id ?? 'EXP-T',
  date: IsoDate.parse(input.date ?? '2024-06-01'),
  benefitType: input.type ?? 'OUTPATIENT',
  subBenefit: input.sub ?? 'Doctor Visit',
  amount: Money.fromMajor(input.amount ?? 1000),
  diagnosis: input.diagnosis ?? 'Acute bronchitis',
  provider: input.provider ?? 'Bangkok Hospital',
  days: input.days ?? DEFAULT_EXPENSE_DAYS,
});

type Row = readonly [string, string, string, string, number, string, number?];

// Mirrors specs/001-policy-benefits-calculator/sample-scenario.md (20 sample expenses).
const SAMPLE_ROWS: readonly Row[] = [
  ['EXP-001', '2024-01-10', 'OUTPATIENT', 'Doctor Visit', 2500, 'Acute bronchitis'],
  ['EXP-002', '2024-01-20', 'INPATIENT', 'Surgery', 40000, 'Acute appendicitis'],
  ['EXP-003', '2024-02-05', 'OUTPATIENT', 'Doctor Visit', 4000, 'Migraine'],
  ['EXP-004', '2024-02-10', 'DENTAL', 'Basic Dental', 3000, 'Dental caries'],
  ['EXP-005', '2024-02-15', 'OUTPATIENT', 'Prescribed Medicine', 1500, 'Acute bronchitis'],
  ['EXP-006', '2024-03-01', 'INPATIENT', 'Room & Board', 30000, 'Dengue fever', 5],
  ['EXP-007', '2024-03-05', 'OUTPATIENT', 'Doctor Visit', 1800, 'Cosmetic skin consultation'],
  ['EXP-008', '2024-03-12', 'OUTPATIENT', 'Diagnostic Tests', 4000, 'Blood panel'],
  ['EXP-009', '2024-04-02', 'DENTAL', 'Basic Dental', 3000, 'Dental caries'],
  ['EXP-010', '2024-04-15', 'OUTPATIENT', 'Diagnostic Tests', 5000, 'MRI lumbar spine'],
  ['EXP-011', '2024-05-03', 'OUTPATIENT', 'Diagnostic Tests', 1200, 'Follow-up X-ray'],
  ['EXP-012', '2024-05-20', 'INPATIENT', 'Ambulance', 2500, 'Road traffic accident'],
  ['EXP-013', '2024-06-08', 'OUTPATIENT', 'Doctor Visit', 2000, 'Bungee jumping ankle sprain'],
  ['EXP-014', '2024-06-15', 'MATERNITY', 'Prenatal Care', 5000, 'Prenatal check-up'],
  ['EXP-015', '2024-07-01', 'OUTPATIENT', 'Doctor Visit', 3000, 'Gastroenteritis'],
  ['EXP-016', '2024-08-10', 'OUTPATIENT', 'Doctor Visit', 3000, 'Influenza'],
  ['EXP-017', '2024-09-05', 'OUTPATIENT', 'Doctor Visit', 3000, 'Sinusitis'],
  ['EXP-018', '2024-10-02', 'OUTPATIENT', 'Prescribed Medicine', 2000, 'Sinusitis'],
  ['EXP-019', '2024-10-20', 'OUTPATIENT', 'Doctor Visit', 1500, 'Tonsillitis'],
  ['EXP-020', '2024-11-12', 'MATERNITY', 'Prenatal Care', 6000, 'Prenatal ultrasound'],
];

export const sampleExpenses = (): Expense[] =>
  SAMPLE_ROWS.map(([id, date, type, sub, amount, diagnosis, days]) =>
    expense({ id, date, type, sub, amount, diagnosis, days }),
  );
