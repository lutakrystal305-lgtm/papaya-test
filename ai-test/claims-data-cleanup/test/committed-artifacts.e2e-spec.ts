import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCli } from '../src/cli/run-cli';
import { captureIo } from './helpers/capture-io';
import { APP_ROOT } from './helpers/fixtures';
import { makeTempDir, removeTempDir } from './helpers/temp-dir';

const ARTIFACTS = [
  'data/claims_dirty.csv',
  'data/claims_dirty.issues.json',
  'output/claims_clean.csv',
  'output/report.md',
  'output/report.json',
];

describe('committed deliverables (SC-005)', () => {
  let cwd: string;

  beforeAll(async () => {
    cwd = makeTempDir();
    await runCli(['all'], captureIo(cwd).io);
  });

  afterAll(() => removeTempDir(cwd));

  it.each(ARTIFACTS)('a fresh `all` run reproduces %s byte for byte', (file) => {
    expect(fs.readFileSync(path.join(cwd, file))).toEqual(
      fs.readFileSync(path.join(APP_ROOT, file)),
    );
  });
});
