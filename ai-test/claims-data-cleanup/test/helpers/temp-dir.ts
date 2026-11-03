import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claims-data-cleanup-'));
}

export function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function listFilesRecursive(dir: string): string[] {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
}
