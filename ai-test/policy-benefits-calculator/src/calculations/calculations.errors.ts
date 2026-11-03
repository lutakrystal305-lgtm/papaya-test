export class InvalidValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidValueError';
  }
}

export const INVALID_POLICY_MESSAGE = 'Invalid policy';

// VALUE issues concern a single field; RULE issues are cross-field policy rules.
export type PolicyIssueKind = 'VALUE' | 'RULE';

export interface PolicyIssue {
  readonly path: string;
  readonly message: string;
  readonly kind: PolicyIssueKind;
}

export const formatIssue = (issue: Pick<PolicyIssue, 'path' | 'message'>): string =>
  `${issue.path}: ${issue.message}`;

export class PolicyValidationError extends Error {
  readonly errors: readonly string[];
  readonly issues: readonly PolicyIssue[];

  constructor(errors: readonly string[], issues: readonly PolicyIssue[] = []) {
    super(INVALID_POLICY_MESSAGE);
    this.name = 'PolicyValidationError';
    this.errors = [...errors];
    this.issues = [...issues];
  }
}

export class InputFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputFormatError';
  }
}
