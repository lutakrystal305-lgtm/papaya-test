import { BenefitLedger } from '../benefit-ledger';
import { Expense } from '../../interfaces/expense.interface';
import { Policy } from '../../interfaces/policy.interface';
import { expense } from '../../../testing/expense.builder';
import { samplePolicy } from '../../../testing/policy.builder';
import { AdjudicationContext, createContext, Denial, isDenial } from './adjudication-context';
import { Money } from '../../utils/money';
import {
  checkAvailability,
  checkExclusion,
  checkPolicyPeriod,
  checkWaitingPeriod,
  resolveBenefit,
} from './eligibility-steps';

const policy = samplePolicy();

const contextFor = (item: Expense, target: Policy = policy): AdjudicationContext => {
  const resolved = resolveBenefit(target, item);
  if (isDenial(resolved)) {
    throw new Error(resolved.reason);
  }
  return createContext(target, BenefitLedger.open(target), item, resolved);
};

const asDenial = (result: object): Denial => {
  if (!isDenial(result)) {
    throw new Error('expected a denial');
  }
  return result;
};

describe('eligibility steps', () => {
  describe('resolveBenefit', () => {
    it('resolves a benefit type and sub-benefit pair', () => {
      const resolved = resolveBenefit(policy, expense({ type: 'OUTPATIENT', sub: 'Doctor Visit' }));
      expect(isDenial(resolved)).toBe(false);
    });

    it.each([
      ['an unknown benefit type', 'VISION', 'Doctor Visit'],
      ['an unknown sub-benefit', 'OUTPATIENT', 'Physiotherapy'],
      ['a sub-benefit under another benefit type', 'DENTAL', 'Doctor Visit'],
    ])('denies %s', (_label, type, sub) => {
      const result = asDenial(resolveBenefit(policy, expense({ type, sub })));
      expect(result.reason).toBe(`Denied: ${type} / ${sub} is not covered by this policy.`);
    });
  });

  describe('checkPolicyPeriod', () => {
    it.each(['2023-12-31', '2025-01-01'])('denies an expense dated %s', (date) => {
      const result = asDenial(checkPolicyPeriod(contextFor(expense({ date }))));
      expect(result.reason).toBe(
        `Denied: expense date ${date} is outside the policy period 2024-01-01 to 2024-12-31.`,
      );
    });

    it.each(['2024-01-01', '2024-12-31'])('accepts the boundary date %s', (date) => {
      expect(isDenial(checkPolicyPeriod(contextFor(expense({ date }))))).toBe(false);
    });
  });

  describe('checkExclusion', () => {
    it('denies a diagnosis matching an exclusion term regardless of case', () => {
      const result = asDenial(
        checkExclusion(contextFor(expense({ diagnosis: 'BOTOX injection for wrinkles' }))),
      );
      expect(result.reason).toBe(
        'Denied: excluded condition "Cosmetic surgery and elective procedures" (matched "botox").',
      );
    });

    it('passes a diagnosis without exclusion terms', () => {
      expect(isDenial(checkExclusion(contextFor(expense({ diagnosis: 'Influenza' }))))).toBe(false);
    });
  });

  describe('checkWaitingPeriod', () => {
    const dental = (date: string): Expense =>
      expense({ date, type: 'DENTAL', sub: 'Basic Dental' });

    it('denies an expense inside the waiting period with the end date and days remaining', () => {
      const result = asDenial(checkWaitingPeriod(contextFor(dental('2024-01-31'))));
      expect(result.reason).toBe(
        'Denied: DENTAL waiting period of 90 days ends 2024-03-31 (60 days remaining).',
      );
    });

    it('denies the last day of the waiting period', () => {
      expect(asDenial(checkWaitingPeriod(contextFor(dental('2024-03-30')))).reason).toContain(
        '(1 days remaining)',
      );
    });

    it('accepts the first eligible day', () => {
      expect(isDenial(checkWaitingPeriod(contextFor(dental('2024-03-31'))))).toBe(false);
    });

    it('accepts benefits without a waiting period', () => {
      expect(isDenial(checkWaitingPeriod(contextFor(expense({ date: '2024-01-01' }))))).toBe(false);
    });
  });

  describe('checkAvailability', () => {
    const zero = Money.zero();
    const consume = (
      ledger: BenefitLedger,
      type: string,
      sub: string,
      covered: number,
      counts: { visits?: number; days?: number } = {},
    ): void =>
      ledger.commit({
        type,
        subBenefit: sub,
        covered: Money.fromMajor(covered),
        deductible: zero,
        visits: counts.visits ?? 0,
        days: counts.days ?? 0,
      });

    const check = (item: Expense, ledger: BenefitLedger): AdjudicationContext | Denial => {
      const resolved = resolveBenefit(policy, item);
      if (isDenial(resolved)) {
        throw new Error(resolved.reason);
      }
      return checkAvailability(createContext(policy, ledger, item, resolved));
    };

    it('passes while balances remain', () => {
      expect(isDenial(check(expense(), BenefitLedger.open(policy)))).toBe(false);
    });

    it('denies when the visit count is exhausted (US2-AS4)', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'OUTPATIENT', 'Doctor Visit', 1000, { visits: 5 });
      expect(asDenial(check(expense(), ledger)).reason).toBe(
        'Denied: Doctor Visit visit limit exhausted (5 of 5 visits used).',
      );
    });

    it('denies when the day count is exhausted', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'INPATIENT', 'Room & Board', 40000, { days: 10 });
      const item = expense({ type: 'INPATIENT', sub: 'Room & Board', amount: 4000 });
      expect(asDenial(check(item, ledger)).reason).toBe(
        'Denied: Room & Board day limit exhausted (10 of 10 days used).',
      );
    });

    it('denies when the sub-benefit annual limit is exhausted (US2-AS3)', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'OUTPATIENT', 'Diagnostic Tests', 6000);
      expect(asDenial(check(expense({ sub: 'Diagnostic Tests' }), ledger)).reason).toBe(
        'Denied: Diagnostic Tests annual sub-limit exhausted (6,000 THB of 6,000 THB used).',
      );
    });

    it('denies when the benefit annual limit is exhausted', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'OUTPATIENT', 'Prescribed Medicine', 20000);
      expect(asDenial(check(expense({ sub: 'Diagnostic Tests' }), ledger)).reason).toBe(
        'Denied: OUTPATIENT annual limit exhausted (20,000 THB of 20,000 THB used).',
      );
    });

    it('names a lifetime limit', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'MATERNITY', 'Normal Delivery', 50000);
      const item = expense({ date: '2024-12-01', type: 'MATERNITY', sub: 'Prenatal Care' });
      expect(asDenial(check(item, ledger)).reason).toBe(
        'Denied: MATERNITY lifetime limit exhausted (50,000 THB of 50,000 THB used).',
      );
    });

    it('checks visits before the benefit limit', () => {
      const ledger = BenefitLedger.open(policy);
      consume(ledger, 'OUTPATIENT', 'Doctor Visit', 20000, { visits: 5 });
      expect(asDenial(check(expense(), ledger)).reason).toContain('visit limit exhausted');
    });
  });
});
