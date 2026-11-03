import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCleanup, serializeReportJson } from '../../run-cleanup';
import type { CleanOptions } from '../args';
import type { CliIo } from '../io';
import { writeOutputFiles } from '../output-files';
import type { OutputFile } from '../output-files';

export function cleanOutputs(
  text: string,
  options: CleanOptions,
): { files: OutputFile[]; markdown: string } {
  const { cleanCsv, report, reportMarkdown } = runCleanup(text, path.basename(options.in));
  return {
    files: [
      { path: options.out, content: cleanCsv },
      { path: options.report, content: reportMarkdown },
      { path: options.reportJson, content: serializeReportJson(report) },
    ],
    markdown: reportMarkdown,
  };
}

export function runClean(options: CleanOptions, io: CliIo): Promise<void> {
  const text = fs.readFileSync(path.resolve(io.cwd, options.in), 'utf8');
  const { files, markdown } = cleanOutputs(text, options);
  writeOutputFiles(io.cwd, files);
  io.stdout(markdown);
  return Promise.resolve();
}
