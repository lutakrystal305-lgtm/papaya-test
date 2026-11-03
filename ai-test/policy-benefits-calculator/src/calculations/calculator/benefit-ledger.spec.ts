import { PolicyFactory } from '../policy/policy.factory';
import { InvalidValueError } from '../calculations.errors';
import { Money } from '../utils/money';
import { BenefitLedger } from './benefit-ledger';

const thb = (major: number): Money => Money.fromMajor(major);

const policy = PolicyFactory.create({
  policyNumber: 'POL-1',
  effectiveDate: '2024-01-01',
  expiryDate: '2024-12-31',
  currency: 'THB',
  benefits: [
    {
      type: 'OUTPATIENT',
      annualLimit: 10000,
      deductible: 1000,
      subBenefits: [
        { name: 'Doctor Visit', limitPerVisit: 3000, visitsPerYear: 2 },
        { name: 'Tests', limitPerYear: 4000 },
      ],
    },
    {
      type: 'INPATIENT',
      lifetimeLimit: 50000,
      subBenefits: [{ name: 'Room', limitPerDay: 1000, maxDays: 3 }],
    },
  ],
});

describe('BenefitLedger', () => {
  let ledger: BenefitLedger;

  beforeEach(() => {
    ledger = BenefitLedger.open(policy);
  });

  it('opens with full balances', () => {
    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(10000);
    expect(ledger.remainingSubYear('OUTPATIENT', 'Tests')?.toMajor()).toBe(4000);
    expect(ledger.remainingSubYear('OUTPATIENT', 'Doctor Visit')).toBeNull();
    expect(ledger.remainingVisits('OUTPATIENT', 'Doctor Visit')).toBe(2);
    expect(ledger.remainingVisits('OUTPATIENT', 'Tests')).toBeNull();
    expect(ledger.remainingDays('INPATIENT', 'Room')).toBe(3);
    expect(ledger.remainingDays('OUTPATIENT', 'Tests')).toBeNull();
    expect(ledger.deductibleRemaining('OUTPATIENT').toMajor()).toBe(1000);
  });

  it('commits covered amount, deductible, visits and days', () => {
    ledger.commit({
      type: 'OUTPATIENT',
      subBenefit: 'Doctor Visit',
      covered: thb(1200),
      deductible: thb(1000),
      visits: 1,
      days: 0,
    });
    ledger.commit({
      type: 'INPATIENT',
      subBenefit: 'Room',
      covered: thb(2000),
      deductible: Money.zero(),
      visits: 0,
      days: 2,
    });

    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(8800);
    expect(ledger.deductibleRemaining('OUTPATIENT').isZero()).toBe(true);
    expect(ledger.remainingVisits('OUTPATIENT', 'Doctor Visit')).toBe(1);
    expect(ledger.remainingBenefit('INPATIENT').toMajor()).toBe(48000);
    expect(ledger.remainingDays('INPATIENT', 'Room')).toBe(1);
  });

  it('tracks several expenses against the same sub-limit', () => {
    const commitTests = (major: number): void =>
      ledger.commit({
        type: 'OUTPATIENT',
        subBenefit: 'Tests',
        covered: thb(major),
        deductible: Money.zero(),
        visits: 0,
        days: 0,
      });

    commitTests(1500);
    commitTests(2500);

    expect(ledger.remainingSubYear('OUTPATIENT', 'Tests')?.isZero()).toBe(true);
    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(6000);
  });

  it('records deductible-only usage without touching limits', () => {
    ledger.commitDeductibleOnly('OUTPATIENT', thb(400));

    expect(ledger.deductibleRemaining('OUTPATIENT').toMajor()).toBe(600);
    expect(ledger.remainingBenefit('OUTPATIENT').toMajor()).toBe(10000);
  });

  it.each([
    [
      'benefit limit',
      {
        type: 'OUTPATIENT',
        subBenefit: 'Doctor Visit',
        covered: thb(10001),
        deductible: Money.zero(),
        visits: 0,
        days: 0,
      },
    ],
    [
      'sub-benefit year limit',
      {
        type: 'OUTPATIENT',
        subBenefit: 'Tests',
        covered: thb(4001),
        deductible: Money.zero(),
        visits: 0,
        days: 0,
      },
    ],
    [
      'visit count',
      {
        type: 'OUTPATIENT',
        subBenefit: 'Doctor Visit',
        covered: thb(1),
        deductible: Money.zero(),
        visits: 3,
        days: 0,
      },
    ],
    [
      'day count',
      {
        type: 'INPATIENT',
        subBenefit: 'Room',
        covered: thb(1),
        deductible: Money.zero(),
        visits: 0,
        days: 4,
      },
    ],
    [
      'deductible',
      {
        type: 'OUTPATIENT',
        subBenefit: 'Tests',
        covered: thb(1),
        deductible: thb(1001),
        visits: 0,
        days: 0,
      },
    ],
  ])('rejects a commit that exceeds the %s and leaves balances unchanged', (_label, commit) => {
    expect(() => ledger.commit(commit)).toThrow(InvalidValueError);
    expect(ledger.remainingBenefit(commit.type).toMajor()).toBe(
      commit.type === 'OUTPATIENT' ? 10000 : 50000,
    );
  });

  it('rejects unknown benefits', () => {
    expect(() => ledger.remainingBenefit('DENTAL')).toThrow(InvalidValueError);
    expect(() => ledger.remainingVisits('OUTPATIENT', 'Unknown')).toThrow(InvalidValueError);
  });

  it('exposes a read-only snapshot in policy order', () => {
    ledger.commit({
      type: 'OUTPATIENT',
      subBenefit: 'Doctor Visit',
      covered: thb(500),
      deductible: thb(100),
      visits: 1,
      days: 0,
    });

    const [outpatient, inpatient] = ledger.snapshot();
    expect(outpatient).toMatchObject({ type: 'OUTPATIENT', limitKind: 'ANNUAL' });
    expect(outpatient.used.toMajor()).toBe(500);
    expect(outpatient.deductibleUsed.toMajor()).toBe(100);
    expect(outpatient.subBenefits[0]).toMatchObject({
      name: 'Doctor Visit',
      visitsLimit: 2,
      visitsUsed: 1,
      daysLimit: null,
    });
    expect(inpatient.subBenefits[0]).toMatchObject({
      name: 'Room',
      daysLimit: 3,
      daysUsed: 0,
      yearLimit: null,
    });
  });
});
