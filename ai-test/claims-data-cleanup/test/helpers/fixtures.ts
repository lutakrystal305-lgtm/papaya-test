import * as fs from 'node:fs';
import * as path from 'node:path';

export const APP_ROOT = path.resolve(__dirname, '../..');
export const FIXTURES = path.join(APP_ROOT, 'test/fixtures');

export function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}
