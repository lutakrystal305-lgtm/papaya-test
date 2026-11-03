import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  InvalidValueError,
  InputFormatError,
  PolicyValidationError,
} from '../calculations/calculations.errors';
import { CalculationBundle } from '../calculations/interfaces/calculation-output.interface';

export const CliExitCode = { OK: 0, INVALID_INPUT: 1, USAGE: 2 } as const;
export const RESULTS_FILE = 'results.json';
export const REPORT_FILE = 'report.md';
const JSON_INDENT = 2;

export class CliError extends Error {
  constructor(
    readonly exitCode: number,
    readonly lines: readonly string[],
  ) {
    super(lines.join('\n'));
  }
}

export const USAGE =
  'usage: yarn calc --policy <policy.json> --expenses <expenses.json> [--out <dir>] [--quiet]';

// Commander only applies exitOverride to the root program, so required options are checked here (exit 2).
export const requireOption = (value: string | undefined, flag: string): string => {
  if (!value) {
    throw new CliError(CliExitCode.USAGE, [`error: required option ${flag} not specified`, USAGE]);
  }
  return value;
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const readJsonFile = async (path: string): Promise<unknown> => {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    throw new CliError(CliExitCode.USAGE, [`error: cannot read ${path}: ${describe(error)}`]);
  }
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new CliError(CliExitCode.INVALID_INPUT, [`error: ${path} is not valid JSON`]);
  }
};

export const writeOutputs = async (dir: string, bundle: CalculationBundle): Promise<void> => {
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, RESULTS_FILE),
      `${JSON.stringify(bundle.output, null, JSON_INDENT)}\n`,
    );
    await writeFile(join(dir, REPORT_FILE), bundle.report);
  } catch (error) {
    throw new CliError(CliExitCode.USAGE, [`error: cannot write to ${dir}: ${describe(error)}`]);
  }
};

export const toCliError = (error: unknown): CliError => {
  if (error instanceof CliError) {
    return error;
  }
  if (error instanceof PolicyValidationError) {
    return new CliError(CliExitCode.INVALID_INPUT, [
      `error: ${error.message}`,
      ...error.errors.map((line) => `  - ${line}`),
    ]);
  }
  if (error instanceof InputFormatError || error instanceof InvalidValueError) {
    return new CliError(CliExitCode.INVALID_INPUT, [`error: ${error.message}`]);
  }
  throw error;
};
