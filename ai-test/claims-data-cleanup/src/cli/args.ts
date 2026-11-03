import { parseArgs } from 'node:util';
import {
  DEFAULT_CLEAN_CSV,
  DEFAULT_DIRTY_CSV,
  DEFAULT_ISSUE_LOG,
  DEFAULT_REPORT_JSON,
  DEFAULT_REPORT_MD,
  DEFAULT_SEED,
  MAX_SEED,
} from '../shared/constants/cli.constants';

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export interface GenerateOptions {
  seed: number;
  out: string;
  log: string;
}

export interface CleanOptions {
  in: string;
  out: string;
  report: string;
  reportJson: string;
}

export type AllOptions = Omit<GenerateOptions, 'out'> & CleanOptions;

export type ParsedArgs =
  | { kind: 'help' }
  | { kind: 'run'; command: 'generate'; options: GenerateOptions }
  | { kind: 'run'; command: 'clean'; options: CleanOptions }
  | { kind: 'run'; command: 'all'; options: AllOptions };

export type Command = Extract<ParsedArgs, { kind: 'run' }>['command'];

const OPTION_SPEC = {
  seed: { type: 'string' },
  out: { type: 'string' },
  log: { type: 'string' },
  in: { type: 'string' },
  report: { type: 'string' },
  'report-json': { type: 'string' },
  help: { type: 'boolean', short: 'h' },
} as const;

type RawOptions = Partial<Record<Exclude<keyof typeof OPTION_SPEC, 'help'>, string>>;

const ALLOWED: Readonly<Record<Command, readonly string[]>> = {
  generate: ['seed', 'out', 'log'],
  clean: ['in', 'out', 'report', 'report-json'],
  all: ['seed', 'in', 'log', 'out', 'report', 'report-json'],
};

function isCommand(value: string): value is Command {
  return Object.prototype.hasOwnProperty.call(ALLOWED, value);
}

export function parseSeed(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_SEED;
  if (!/^\d+$/.test(raw) || Number(raw) > MAX_SEED) {
    throw new UsageError(`invalid --seed "${raw}": expected a whole number from 0 to ${MAX_SEED}`);
  }
  return Number(raw);
}

function readRaw(argv: readonly string[]): {
  positionals: string[];
  values: RawOptions & { help?: boolean };
} {
  try {
    return parseArgs({
      args: [...argv],
      options: OPTION_SPEC,
      strict: true,
      allowPositionals: true,
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

function assertAllowed(command: Command, values: RawOptions): void {
  const invalid = Object.keys(values).filter((name) => !ALLOWED[command].includes(name));
  if (invalid.length > 0) {
    throw new UsageError(
      `option not valid for ${command}: ${invalid.map((n) => `--${n}`).join(', ')}`,
    );
  }
}

function buildOptions(command: Command, v: RawOptions): ParsedArgs {
  const clean: CleanOptions = {
    in: v.in ?? DEFAULT_DIRTY_CSV,
    out: v.out ?? DEFAULT_CLEAN_CSV,
    report: v.report ?? DEFAULT_REPORT_MD,
    reportJson: v['report-json'] ?? DEFAULT_REPORT_JSON,
  };
  const seed = parseSeed(v.seed);
  const log = v.log ?? DEFAULT_ISSUE_LOG;
  if (command === 'generate') {
    return { kind: 'run', command, options: { seed, out: v.out ?? DEFAULT_DIRTY_CSV, log } };
  }
  if (command === 'clean') return { kind: 'run', command, options: clean };
  return { kind: 'run', command, options: { seed, log, ...clean } };
}

export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  const { positionals, values } = readRaw(argv);
  if (values.help) return { kind: 'help' };
  const [command, ...extra] = positionals;
  if (command === undefined) throw new UsageError('missing command');
  if (!isCommand(command)) throw new UsageError(`unknown command "${command}"`);
  if (extra.length > 0) throw new UsageError(`unexpected argument "${extra[0]}"`);
  const { help: _help, ...options } = values;
  assertAllowed(command, options);
  return buildOptions(command, options);
}
