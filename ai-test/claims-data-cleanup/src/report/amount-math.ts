const HUNDREDTHS_PER_UNIT = 100;

const AMOUNT_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Mean in whole hundredths, rounded half up with integer arithmetic: floor((2·sum + n) / 2n). */
export function averageHundredths(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.floor((2 * sum + values.length) / (2 * values.length));
}

export function hundredthsToNumber(hundredths: number): number {
  return hundredths / HUNDREDTHS_PER_UNIT;
}

export function formatAmount(hundredths: number): string {
  return AMOUNT_FORMAT.format(hundredthsToNumber(hundredths));
}
