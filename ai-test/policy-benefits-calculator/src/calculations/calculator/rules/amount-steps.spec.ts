import { BenefitLedger } from '../benefit-ledger';
import { Expense } from '../../interfaces/expense.interface';
import { Policy } from '../../interfaces/policy.interface';
import { expense } from '../../../testing/expense.builder';
import { policyWith, samplePolicy } from '../../../testing/policy.builder';
import { AdjudicationContext, createContext, Denial, isDenial } from './adjudication-context';
import { Money } from '../../utils/money';
import { applyCap, applyCopay, applyDeductible, applyRemainingLimits } from './amount-steps';
import { resolveBenefit } from './eligibility-steps';

const noDeductible = policyWith('OUTPATIENT', { deductible: 0 });

const contextFor = (
  item: Expense,
  policy: Policy = noDeductible,
  ledger?: BenefitLedger,
): AdjudicationContext => {
  const resolved = resolveBenefit(policy, item);
  if (isDenial(resolved)) {
    throw new Error(resolved.reason);
  }
  return createContext(policy, ledger ?? BenefitLedger.open(policy), item, resolved);
};

const asContext = (result: AdjudicationContext | Denial): AdjudicationContext => {
  if (isDenial(result)) {
    throw new Error(result.reason);
  }
  return result;
};

const run = (
  ctx: AdjudicationContext,
  ...steps: ((c: AdjudicationContext) => AdjudicationContext | Denial)[]
): AdjudicationContext | Denial =>
  steps.reduce<AdjudicationContext | Denial>(
    (current, step) => (isDenial(current) ? current : step(current)),
    ctx,
  );

describe('amount steps', () => {
  describe('applyCap', () => {
    it('caps an expense at the per-visit limit (US1-AS5)', () => {
      const ctx = asContext(applyCap(contextFor(expense({ amount: 4000 }))));
      expect(ctx.eligible.toMajor()).toBe(3000);
      expect(ctx.fragments).toEqual(['Per-visit limit 3,000 THB applied; 1,000 THB not covered.']);
    });

    it('leaves an expense under the per-visit limit unchanged', () => {
      const ctx = asContext(applyCap(contextFor(expense({ amount: 2500 }))));
      expect(ctx.eligible.toMajor()).toBe(2500);
      expect(ctx.fragments).toEqual([]);
    });

    it('caps at the per-event limit', () => {
      const ctx = asContext(
        applyCap(contextFor(expense({ type: 'INPATIENT', sub: 'Ambulance', amount: 4000 }))),
      );
      expect(ctx.fragments).toEqual(['Per-event limit 3,000 THB applied; 1,000 THB not covered.']);
    });

    it('caps a per-day benefit at the daily limit times the days used', () => {
      const ctx = asContext(
        applyCap(
          contextFor(expense({ type: 'INPATIENT', sub: 'Room & Board', amount: 30000, days: 5 })),
        ),
      );
      expect(ctx.eligible.toMajor()).toBe(20000);
      expect(ctx.daysToUse).toBe(5);
      expect(ctx.fragments).toEqual([
        'Per-day limit 4,000 THB × 5 days = 20,000 THB applied; 10,000 THB not covered.',
      ]);
    });

    it('limits per-day coverage to the days remaining', () => {
      const policy = samplePolicy();
      const ledger = BenefitLedger.open(policy);
      ledger.commit({
        type: 'INPATIENT',
        subBenefit: 'Room & Board',
        covered: expense().amount,
        deductible: expense().amount.subtractFloor0(expense().amount),
        visits: 0,
        days: 8,
      });
      const item = expense({ type: 'INPATIENT', sub: 'Room & Board', amount: 20000, days: 5 });

      const ctx = asContext(applyCap(contextFor(item, policy, ledger)));
      expect(ctx.daysToUse).toBe(2);
      expect(ctx.eligible.toMajor()).toBe(8000);
    });

    it('does not cap a sub-benefit without a per-expense limit', () => {
      const ctx = asContext(
        applyCap(contextFor(expense({ sub: 'Diagnostic Tests', amount: 9000 }))),
      );
      expect(ctx.eligible.toMajor()).toBe(9000);
    });
  });

  describe('applyDeductible', () => {
    it('takes the deductible before copay and reports what remains (US1-AS6)', () => {
      const ctx = asContext(
        run(contextFor(expense({ amount: 2500 }), samplePolicy()), applyCap, applyDeductible),
      );
      expect(ctx.deductibleApplied.toMajor()).toBe(1000);
      expect(ctx.covered.toMajor()).toBe(1500);
      expect(ctx.fragments).toEqual([
        'Deductible applied: 1,000 THB (0 THB deductible remaining).',
      ]);
    });

    it('does nothing when the benefit has no deductible', () => {
      const ctx = asContext(run(contextFor(expense({ amount: 2500 })), applyCap, applyDeductible));
      expect(ctx.deductibleApplied.isZero()).toBe(true);
      expect(ctx.fragments).toEqual([]);
    });

    it('denies an expense entirely absorbed by the deductible', () => {
      const result = run(
        contextFor(expense({ amount: 800 }), samplePolicy()),
        applyCap,
        applyDeductible,
      );
      if (!isDenial(result)) {
        throw new Error('expected a denial');
      }
      expect(result.deductibleApplied.toMajor()).toBe(800);
      expect(result.reason).toBe(
        'Denied: amount applied to deductible: 800 THB (200 THB deductible remaining); nothing payable.',
      );
    });
  });

  describe('applyCopay', () => {
    const copay = (item: Expense, policy?: Policy): AdjudicationContext =>
      asContext(run(contextFor(item, policy), applyCap, applyDeductible, applyCopay));

    it('applies a percentage copay (US1-AS1)', () => {
      const ctx = copay(expense({ amount: 2500 }));
      expect(ctx.copay.toMajor()).toBe(500);
      expect(ctx.covered.toMajor()).toBe(2000);
      expect(ctx.fragments).toEqual(['20% copay applied: 500 THB.']);
    });

    it('caps a percentage copay at the per-visit maximum', () => {
      const ctx = copay(expense({ amount: 3000 }));
      expect(ctx.copay.toMajor()).toBe(500);
      expect(ctx.fragments).toEqual(['20% copay applied, capped at 500 THB per visit: 500 THB.']);
    });

    it('applies a sub-benefit fixed copay that overrides the benefit copay (US1-AS7)', () => {
      const ctx = copay(expense({ sub: 'Prescribed Medicine', amount: 1500 }));
      expect(ctx.copay.toMajor()).toBe(200);
      expect(ctx.covered.toMajor()).toBe(1300);
      expect(ctx.fragments).toEqual(['Fixed copay applied: 200 THB.']);
    });

    it('skips a 0% copay (US1-AS2)', () => {
      const ctx = copay(expense({ type: 'INPATIENT', sub: 'Surgery', amount: 40000 }));
      expect(ctx.copay.isZero()).toBe(true);
      expect(ctx.covered.toMajor()).toBe(40000);
      expect(ctx.fragments).toEqual([]);
    });

    it('skips benefits without a copay rule', () => {
      const ctx = copay(
        expense({ date: '2024-11-01', type: 'MATERNITY', sub: 'Prenatal Care', amount: 5000 }),
      );
      expect(ctx.covered.toMajor()).toBe(5000);
    });
  });

  describe('applyRemainingLimits', () => {
    const uncappedCopay = policyWith('OUTPATIENT', { deductible: 0, copay: { percentage: 20 } });
    const consume = (ledger: BenefitLedger, sub: string, covered: number): void =>
      ledger.commit({
        type: 'OUTPATIENT',
        subBenefit: sub,
        covered: Money.fromMajor(covered),
        deductible: Money.zero(),
        visits: 0,
        days: 0,
      });
    const limited = (item: Expense, ledger: BenefitLedger): AdjudicationContext =>
      asContext(
        run(
          contextFor(item, uncappedCopay, ledger),
          applyCap,
          applyDeductible,
          applyCopay,
          applyRemainingLimits,
        ),
      );

    it('takes copay first, then caps at the remaining sub-limit (US2-AS2, clarification Q2)', () => {
      const ledger = BenefitLedger.open(uncappedCopay);
      consume(ledger, 'Diagnostic Tests', 1000);

      const ctx = limited(expense({ sub: 'Diagnostic Tests', amount: 8000 }), ledger);

      expect(ctx.copay.toMajor()).toBe(1600);
      expect(ctx.covered.toMajor()).toBe(5000);
      expect(ctx.fragments).toEqual([
        '20% copay applied: 1,600 THB.',
        'Covered amount limited by remaining Diagnostic Tests annual sub-limit (5,000 THB); 1,400 THB above limit.',
      ]);
    });

    it('names the parent benefit limit when it is tighter (US2-AS5)', () => {
      const ledger = BenefitLedger.open(uncappedCopay);
      consume(ledger, 'Prescribed Medicine', 19000);

      const ctx = limited(expense({ sub: 'Diagnostic Tests', amount: 2000 }), ledger);

      expect(ctx.covered.toMajor()).toBe(1000);
      expect(ctx.fragments[1]).toBe(
        'Covered amount limited by remaining OUTPATIENT annual limit (1,000 THB); 600 THB above limit.',
      );
    });

    it('leaves the amount unchanged when enough limit remains', () => {
      const ctx = limited(
        expense({ sub: 'Diagnostic Tests', amount: 2000 }),
        BenefitLedger.open(uncappedCopay),
      );
      expect(ctx.covered.toMajor()).toBe(1600);
      expect(ctx.fragments).toEqual(['20% copay applied: 400 THB.']);
    });
  });
});
