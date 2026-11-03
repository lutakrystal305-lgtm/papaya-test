import * as fs from 'node:fs';
import * as path from 'node:path';

export interface OutputFile {
  path: string;
  content: string;
}

/** Each file is written to `<path>.tmp` then renamed, so a reader never sees a half-written file. */
export function writeOutputFiles(cwd: string, files: readonly OutputFile[]): void {
  for (const file of files) {
    const target = path.resolve(cwd, file.path);
    const temp = `${target}.tmp`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temp, file.content, 'utf8');
    fs.renameSync(temp, target);
  }
}
