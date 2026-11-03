import { Command, CommandRunner, Option } from 'nest-commander';

import { CalculationsService } from '../calculations/calculations.service';
import { CliExitCode, readJsonFile, requireOption, toCliError, writeOutputs } from './calc-io';

export interface CalcOptions {
  policy?: string;
  expenses?: string;
  out?: string;
  quiet?: boolean;
}

export const CLI_EXIT_USAGE = CliExitCode.USAGE;
const DEFAULT_OUT_DIR = './out';

@Command({ name: 'calc', description: 'Calculate covered amounts for a policy and expenses file' })
export class CalcCommand extends CommandRunner {
  constructor(private readonly calculationsService: CalculationsService) {
    super();
  }

  async run(_params: string[], options: CalcOptions): Promise<void> {
    try {
      const policyPath = requireOption(options.policy, '--policy');
      const expensesPath = requireOption(options.expenses, '--expenses');
      const policy = await readJsonFile(policyPath);
      const expenses = await readJsonFile(expensesPath);
      const bundle = this.calculationsService.calculate(policy, expenses);
      await writeOutputs(options.out ?? DEFAULT_OUT_DIR, bundle);
      if (!options.quiet) {
        process.stdout.write(bundle.report);
      }
      process.exitCode = CliExitCode.OK;
    } catch (error) {
      const cliError = toCliError(error);
      process.stderr.write(cliError.lines.map((line) => `${line}\n`).join(''));
      process.exitCode = cliError.exitCode;
    }
  }

  @Option({ flags: '-p, --policy <path>', description: 'Policy JSON file (required)' })
  parsePolicy(value: string): string {
    return value;
  }

  @Option({
    flags: '-e, --expenses <path>',
    description: 'Expenses JSON array file (required)',
  })
  parseExpenses(value: string): string {
    return value;
  }

  @Option({
    flags: '-o, --out <dir>',
    description: 'Output directory',
    defaultValue: DEFAULT_OUT_DIR,
  })
  parseOut(value: string): string {
    return value;
  }

  @Option({ flags: '-q, --quiet', description: 'Do not print the report to stdout' })
  parseQuiet(): boolean {
    return true;
  }
}
