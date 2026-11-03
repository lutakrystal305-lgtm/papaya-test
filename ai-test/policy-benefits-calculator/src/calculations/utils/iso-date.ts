import { MS_PER_DAY } from '../calculations.constants';
import { InvalidValueError } from '../calculations.errors';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_LENGTH = 10;

const toDayNumber = (value: string): number | null => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDate ? date.getTime() / MS_PER_DAY : null;
};

export class IsoDate {
  private constructor(readonly dayNumber: number) {}

  static parse(value: string): IsoDate {
    const dayNumber = toDayNumber(value);
    if (dayNumber === null) {
      throw new InvalidValueError(`"${value}" is not a valid YYYY-MM-DD date`);
    }
    return new IsoDate(dayNumber);
  }

  static isValid(value: unknown): value is string {
    return typeof value === 'string' && toDayNumber(value) !== null;
  }

  addDays(days: number): IsoDate {
    return new IsoDate(this.dayNumber + days);
  }

  daysUntil(other: IsoDate): number {
    return other.dayNumber - this.dayNumber;
  }

  compare(other: IsoDate): number {
    return this.dayNumber - other.dayNumber;
  }

  isBefore(other: IsoDate): boolean {
    return this.dayNumber < other.dayNumber;
  }

  isAfter(other: IsoDate): boolean {
    return this.dayNumber > other.dayNumber;
  }

  isOnOrAfter(other: IsoDate): boolean {
    return this.dayNumber >= other.dayNumber;
  }

  toString(): string {
    return new Date(this.dayNumber * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
  }
}
