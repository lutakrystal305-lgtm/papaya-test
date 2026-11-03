import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeOutputFiles } from './output-files';

describe('writeOutputFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdc-out-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('resolves relative paths against cwd and creates parent folders', () => {
    writeOutputFiles(dir, [{ path: 'a/b/c.txt', content: 'x' }]);
    expect(fs.readFileSync(path.join(dir, 'a/b/c.txt'), 'utf8')).toBe('x');
  });

  it('keeps absolute paths as given', () => {
    const target = path.join(dir, 'abs.txt');
    writeOutputFiles('/nonexistent-cwd', [{ path: target, content: 'abs' }]);
    expect(fs.readFileSync(target, 'utf8')).toBe('abs');
  });

  it('overwrites existing files', () => {
    fs.writeFileSync(path.join(dir, 'f.txt'), 'old');
    writeOutputFiles(dir, [{ path: 'f.txt', content: 'new' }]);
    expect(fs.readFileSync(path.join(dir, 'f.txt'), 'utf8')).toBe('new');
  });

  it('leaves no .tmp files behind', () => {
    writeOutputFiles(dir, [
      { path: 'one.txt', content: '1' },
      { path: 'two.txt', content: '2' },
    ]);
    expect(fs.readdirSync(dir).sort()).toEqual(['one.txt', 'two.txt']);
  });

  it('writes UTF-8 bytes with no BOM', () => {
    writeOutputFiles(dir, [{ path: 'u.txt', content: 'đồng →' }]);
    expect(fs.readFileSync(path.join(dir, 'u.txt'))).toEqual(Buffer.from('đồng →', 'utf8'));
  });
});
