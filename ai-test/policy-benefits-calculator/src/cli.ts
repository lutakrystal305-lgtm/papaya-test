import 'reflect-metadata';

import { CommandFactory } from 'nest-commander';

import { CLI_EXIT_USAGE } from './cli/calc.command';
import { CliModule } from './cli/cli.module';

interface CommanderExit {
  exitCode?: number;
}

// Commander already printed the message; map usage errors to exit code 2 and keep --help at 0.
const exitOnUsageError = (error: Error): void => {
  process.exit((error as CommanderExit).exitCode === 0 ? 0 : CLI_EXIT_USAGE);
};

async function bootstrap(): Promise<void> {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn'],
    errorHandler: exitOnUsageError,
  });
}

void bootstrap();
