import {
  EXIT_DATA_ERROR,
  EXIT_OK,
  EXIT_USAGE_ERROR,
  USAGE_TEXT,
} from '../shared/constants/cli.constants';
import { GeneratorSelfCheckError, InputFormatError } from '../shared/errors';
import { parseCliArgs, UsageError } from './args';
import type { ParsedArgs } from './args';
import { runAll } from './commands/all';
import { runClean } from './commands/clean';
import { runGenerate } from './commands/generate';
import type { CliIo } from './io';

export type { CliIo } from './io';

type RunArgs = Extract<ParsedArgs, { kind: 'run' }>;

function dispatch(args: RunArgs, io: CliIo): Promise<void> {
  switch (args.command) {
    case 'generate':
      return runGenerate(args.options, io);
    case 'clean':
      return runClean(args.options, io);
    case 'all':
      return runAll(args.options, io);
  }
}

/** Structural check: Node's own errors are not `instanceof Error` across VM contexts (e.g. Jest). */
function isFileSystemError(error: unknown): error is NodeJS.ErrnoException {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as Partial<NodeJS.ErrnoException>;
  return typeof code === 'string' && typeof message === 'string';
}

function isDataError(error: unknown): error is { message: string } {
  return (
    error instanceof InputFormatError ||
    error instanceof GeneratorSelfCheckError ||
    isFileSystemError(error)
  );
}

export async function runCli(argv: readonly string[], io: CliIo): Promise<number> {
  try {
    const args = parseCliArgs(argv);
    if (args.kind === 'help') {
      io.stdout(USAGE_TEXT);
      return EXIT_OK;
    }
    await dispatch(args, io);
    return EXIT_OK;
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`error: ${error.message}\n${USAGE_TEXT}`);
      return EXIT_USAGE_ERROR;
    }
    if (isDataError(error)) {
      io.stderr(`error: ${error.message}\n`);
      return EXIT_DATA_ERROR;
    }
    throw error;
  }
}
