import {
  InvalidValueError,
  formatIssue,
  PolicyIssue,
  PolicyIssueKind,
} from '../calculations.errors';

// Collects every policy violation instead of failing on the first one (FR-006).
export class ViolationCollector {
  readonly issues: PolicyIssue[] = [];

  get errors(): string[] {
    return this.issues.map(formatIssue);
  }

  add(path: string, message: string, kind: PolicyIssueKind = 'RULE'): void {
    this.issues.push({ path, message, kind });
  }

  addValue(path: string, message: string): void {
    this.add(path, message, 'VALUE');
  }

  attempt<T>(path: string, build: () => T): T | null {
    try {
      return build();
    } catch (error) {
      if (error instanceof InvalidValueError) {
        this.addValue(path, error.message);
        return null;
      }
      throw error;
    }
  }
}
