import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

import { InvalidValueError, InputFormatError, PolicyValidationError } from './calculations.errors';

interface JsonResponse {
  status(code: number): { json(body: unknown): unknown };
}

// InvalidValueError is a safety net: inputs are validated before they reach the calculator.
@Catch(PolicyValidationError, InputFormatError, InvalidValueError)
export class CalculationExceptionFilter implements ExceptionFilter {
  catch(
    exception: PolicyValidationError | InputFormatError | InvalidValueError,
    host: ArgumentsHost,
  ): void {
    const errors = exception instanceof PolicyValidationError ? [...exception.errors] : [];
    host
      .switchToHttp()
      .getResponse<JsonResponse>()
      .status(HttpStatus.BAD_REQUEST)
      .json({ statusCode: HttpStatus.BAD_REQUEST, message: exception.message, errors });
  }
}
