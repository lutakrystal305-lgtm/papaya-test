import { ValidationError } from 'class-validator';

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

// class-validator messages start with the property name; the path already carries it.
const withoutProperty = (message: string, property: string): string =>
  message.startsWith(`${property} `) ? message.slice(property.length + 1) : message;

export const flattenValidationErrors = (
  errors: readonly ValidationError[],
  parentPath = '',
): FieldError[] =>
  errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      path,
      message: withoutProperty(message, error.property),
    }));
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
