import type { AllOptions } from '../args';
import type { CliIo } from '../io';
import { writeOutputFiles } from '../output-files';
import { cleanOutputs } from './clean';
import { generateOutputs } from './generate';

/** Generates and cleans fully in memory, then writes all five files in one step. */
export function runAll(options: AllOptions, io: CliIo): Promise<void> {
  const generated = generateOutputs({ seed: options.seed, out: options.in, log: options.log });
  const cleaned = cleanOutputs(generated.csv, options);
  writeOutputFiles(io.cwd, [...generated.files, ...cleaned.files]);
  io.stdout(`${generated.summary}\n${cleaned.markdown}`);
  return Promise.resolve();
}
