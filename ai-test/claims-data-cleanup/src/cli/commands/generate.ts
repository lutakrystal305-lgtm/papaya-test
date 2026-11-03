import { generateClaims } from '../../generator/generator';
import type { GenerateOptions } from '../args';
import type { CliIo } from '../io';
import { writeOutputFiles } from '../output-files';
import type { OutputFile } from '../output-files';

export interface GenerateOutputs {
  csv: string;
  files: OutputFile[];
  summary: string;
}

export function generateOutputs(options: GenerateOptions): GenerateOutputs {
  const { csv, issueLog } = generateClaims({ seed: options.seed });
  const { total_rows, rows_with_issues, rows_with_multiple_issues } = issueLog;
  return {
    csv,
    files: [
      { path: options.out, content: csv },
      { path: options.log, content: `${JSON.stringify(issueLog, null, 2)}\n` },
    ],
    summary: `Generated ${total_rows} rows (${rows_with_issues} with issues, ${rows_with_multiple_issues} with multiple) → ${options.out} (seed ${options.seed})\n`,
  };
}

export function runGenerate(options: GenerateOptions, io: CliIo): Promise<void> {
  const { files, summary } = generateOutputs(options);
  writeOutputFiles(io.cwd, files);
  io.stdout(summary);
  return Promise.resolve();
}
