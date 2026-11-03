import { CapKind, LimitKind } from '../calculations.constants';
import { PolicyValidationError } from '../calculations.errors';
import { PolicyDraft } from '../interfaces/policy-draft.interface';
import { PolicyFactory } from './policy.factory';

const validDraft = (): PolicyDraft => ({
  policyNumber: 'POL-1',
  planName: 'Plan',
  effectiveDate: '2024-01-01',
  expiryDate: '2024-12-31',
  currency: 'THB',
  benefits: [
    {
      type: 'OUTPATIENT',
      annualLimit: 20000,
      deductible: 1000,
      copay: { percentage: 20, maxPerVisit: 500 },
      subBenefits: [
        { name: 'Doctor Visit', limitPerVisit: 3000, visitsPerYear: 5 },
        { name: 'Medicine', limitPerEvent: 2000, copay: { fixedPerVisit: 200 } },
      ],
    },
    {
      type: 'INPATIENT',
      lifetimeLimit: 100000,
      waitingPeriodDays: 30,
      subBenefits: [{ name: 'Room', limitPerDay: 4000, maxDays: 10, limitPerYear: 30000 }],
    },
  ],
  exclusions: [{ label: 'Cosmetic', terms: ['cosmetic'] }],
});

const errorsOf = (draft: PolicyDraft): readonly string[] => {
  try {
    PolicyFactory.create(draft);
  } catch (error) {
    if (error instanceof PolicyValidationError) {
      return error.errors;
    }
    throw error;
  }
  return [];
};

describe('PolicyFactory', () => {
  it('builds a policy from a valid draft', () => {
    const policy = PolicyFactory.create(validDraft());

    const [outpatient, inpatient] = policy.benefits;
    expect(policy.effectiveDate.toString()).toBe('2024-01-01');
    expect(outpatient.limitKind).toBe(LimitKind.ANNUAL);
    expect(outpatient.deductible.toMajor()).toBe(1000);
    expect(outpatient.subBenefits[0].cap).toMatchObject({ kind: CapKind.PER_VISIT, maxDays: null });
    expect(outpatient.subBenefits[1].cap?.kind).toBe(CapKind.PER_EVENT);
    expect(outpatient.subBenefits[1].copay?.kind).toBe('FIXED');
    expect(inpatient.limitKind).toBe(LimitKind.LIFETIME);
    expect(inpatient.deductible.isZero()).toBe(true);
    expect(inpatient.subBenefits[0].cap).toMatchObject({ kind: CapKind.PER_DAY, maxDays: 10 });
    expect(policy.exclusions).toEqual([{ label: 'Cosmetic', terms: ['cosmetic'] }]);
  });

  it('reports every cross-field violation together', () => {
    const draft = validDraft();
    const errors = errorsOf({
      ...draft,
      expiryDate: '2023-12-31',
      benefits: [
        {
          ...draft.benefits[0],
          lifetimeLimit: 5000,
          copay: { percentage: 20, fixedPerVisit: 100 },
          subBenefits: [
            { name: 'Doctor Visit', limitPerVisit: 3000, limitPerDay: 100 },
            { name: 'Doctor Visit', maxDays: 3, copay: {} },
          ],
        },
        { type: 'OUTPATIENT', subBenefits: [{ name: 'X' }] },
      ],
    });

    expect(errors).toEqual([
      'plan.expiry_date: must be after plan.effective_date',
      'benefits.0: exactly one of annual_limit or lifetime_limit is required',
      'benefits.0.copay: exactly one of percentage or fixed_per_visit is required',
      'benefits.0.sub_benefits.0: at most one of limit_per_visit, limit_per_event, limit_per_day may be set',
      'benefits.0.sub_benefits.1: max_days requires limit_per_day',
      'benefits.0.sub_benefits.1.copay: exactly one of percentage or fixed_per_visit is required',
      'benefits.0.sub_benefits.1: duplicate sub-benefit name "Doctor Visit"',
      'benefits.1: exactly one of annual_limit or lifetime_limit is required',
      'benefits.1: duplicate benefit type "OUTPATIENT"',
    ]);
  });

  it('reports invalid values when used without DTO validation', () => {
    const draft = validDraft();
    const errors = errorsOf({
      ...draft,
      effectiveDate: '2024-02-30',
      benefits: [{ ...draft.benefits[0], annualLimit: -5, copay: { percentage: 150 } }],
    });

    expect(errors).toEqual([
      'plan.effective_date: "2024-02-30" is not a valid YYYY-MM-DD date',
      'benefits.0.annual_limit: Money must be a non-negative finite amount, got -5',
      'benefits.0.copay: Copay percentage must be between 0 and 100, got 150',
    ]);
  });

  it('rejects zero limits', () => {
    const draft = validDraft();
    const errors = errorsOf({ ...draft, benefits: [{ ...draft.benefits[1], lifetimeLimit: 0 }] });

    expect(errors).toEqual(['benefits.0.lifetime_limit: must be greater than 0']);
  });
});
