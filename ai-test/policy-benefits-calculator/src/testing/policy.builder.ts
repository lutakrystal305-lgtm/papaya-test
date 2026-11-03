import { PolicyDraft } from '../calculations/interfaces/policy-draft.interface';
import { Policy } from '../calculations/interfaces/policy.interface';
import { PolicyFactory } from '../calculations/policy/policy.factory';

// Mirrors specs/001-policy-benefits-calculator/sample-scenario.md "Sample inputs".
export const samplePolicyDraft = (): PolicyDraft => ({
  policyNumber: 'POL-2024-TH-00789',
  planName: 'Corporate Health Plus',
  effectiveDate: '2024-01-01',
  expiryDate: '2024-12-31',
  currency: 'THB',
  benefits: [
    {
      type: 'INPATIENT',
      annualLimit: 200000,
      copay: { percentage: 0 },
      subBenefits: [
        { name: 'Room & Board', limitPerDay: 4000, maxDays: 10 },
        { name: 'Surgery', limitPerEvent: 150000 },
        { name: 'Ambulance', limitPerEvent: 3000 },
      ],
    },
    {
      type: 'OUTPATIENT',
      annualLimit: 20000,
      deductible: 1000,
      copay: { percentage: 20, maxPerVisit: 500 },
      subBenefits: [
        { name: 'Doctor Visit', limitPerVisit: 3000, visitsPerYear: 5 },
        { name: 'Prescribed Medicine', limitPerVisit: 2000, copay: { fixedPerVisit: 200 } },
        { name: 'Diagnostic Tests', limitPerYear: 6000 },
      ],
    },
    {
      type: 'DENTAL',
      annualLimit: 10000,
      waitingPeriodDays: 90,
      copay: { percentage: 30 },
      subBenefits: [
        { name: 'Basic Dental', limitPerYear: 6000 },
        { name: 'Major Dental', limitPerYear: 4000 },
      ],
    },
    {
      type: 'MATERNITY',
      lifetimeLimit: 50000,
      waitingPeriodDays: 270,
      subBenefits: [
        { name: 'Prenatal Care', limitPerYear: 15000 },
        { name: 'Normal Delivery', limitPerEvent: 50000 },
      ],
    },
  ],
  exclusions: [
    {
      label: 'Cosmetic surgery and elective procedures',
      terms: ['cosmetic', 'aesthetic', 'botox'],
    },
    { label: 'Self-inflicted injuries', terms: ['self-inflicted'] },
    {
      label: 'Injuries from extreme sports without prior declaration',
      terms: ['bungee', 'skydiving'],
    },
  ],
});

export const samplePolicy = (): Policy => PolicyFactory.create(samplePolicyDraft());

type BenefitPatch = Partial<PolicyDraft['benefits'][number]>;

export const policyWith = (type: string, patch: BenefitPatch): Policy => {
  const draft = samplePolicyDraft();
  return PolicyFactory.create({
    ...draft,
    benefits: draft.benefits.map((benefit) =>
      benefit.type === type ? { ...benefit, ...patch } : benefit,
    ),
  });
};
