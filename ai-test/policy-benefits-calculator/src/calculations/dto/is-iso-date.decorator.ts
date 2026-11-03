import { ValidateBy, ValidationOptions } from 'class-validator';

import { IsoDate } from '../utils/iso-date';

export const ISO_DATE_MESSAGE = 'must be a valid YYYY-MM-DD date';

// Checks the calendar too, so 2024-02-30 is rejected.
export const IsIsoDate = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'isIsoDate',
      validator: {
        validate: (value: unknown): boolean => IsoDate.isValid(value),
        defaultMessage: (): string => ISO_DATE_MESSAGE,
      },
    },
    options,
  );
