import { BenefitLedger } from '../benefit-ledger';
import { Money } from '../../utils/money';
import { expense } from '../../../testing/expense.builder';
import { samplePolicy } from '../../../testing/policy.builder';
import { AdjudicationContext, createContext, deny, isDenial, Step } from './adjudication-context';
import { resolveBenefit } from './eligibility-steps';
import { runPipeline } from './pipeline';

const policy = samplePolicy();
const item = expense();
const resolved = resolveBenefit(policy, item);
if (isDenial(resolved)) {
  throw new Error(resolved.reason);
}
const start = createContext(policy, BenefitLedger.open(policy), item, resolved);

const appendFragment =
  (text: string): Step =>
  (ctx) => ({ ...ctx, fragments: [...ctx.fragments, text] });

describe('runPipeline', () => {
  it('runs steps in order and passes the context along', () => {
    const result = runPipeline(start, [
      appendFragment('a'),
      appendFragment('b'),
    ]) as AdjudicationContext;
    expect(result.fragments).toEqual(['a', 'b']);
    expect(result.expense).toBe(item);
  });

  it('stops at the first denial', () => {
    const later = jest.fn<AdjudicationContext, [AdjudicationContext]>((ctx) => ctx);
    const result = runPipeline(start, [appendFragment('a'), () => deny('stop'), later]);

    expect(isDenial(result) && result.reason).toBe('stop');
    expect(later).not.toHaveBeenCalled();
  });

  it('returns the starting context when there are no steps', () => {
    expect(runPipeline(start, [])).toBe(start);
  });

  it('records the deductible applied on a denial', () => {
    const denial = deny('deductible', Money.fromMajor(800));
    expect(denial.deductibleApplied.toMajor()).toBe(800);
    expect(deny('plain').deductibleApplied.isZero()).toBe(true);
  });
});
