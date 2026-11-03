import { ArgumentsHost } from '@nestjs/common';

import { InvalidValueError, InputFormatError, PolicyValidationError } from './calculations.errors';
import { CalculationExceptionFilter } from './calculation-exception.filter';

const hostFor = (json: jest.Mock): { host: ArgumentsHost; status: jest.Mock } => {
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status };
};

describe('CalculationExceptionFilter', () => {
  const filter = new CalculationExceptionFilter();

  it.each([
    [
      new PolicyValidationError(['a: b']),
      { statusCode: 400, message: 'Invalid policy', errors: ['a: b'] },
    ],
    [
      new InputFormatError('expenses must be an array'),
      { statusCode: 400, message: 'expenses must be an array', errors: [] },
    ],
    [
      new InvalidValueError('Money must not exceed 1'),
      { statusCode: 400, message: 'Money must not exceed 1', errors: [] },
    ],
  ])('maps %p to a 400 response', (error, body) => {
    const json = jest.fn();
    const { host, status } = hostFor(json);

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(body);
  });
});
