import { spawnSync } from 'node:child_process';
import { APP_ROOT } from './helpers/fixtures';

describe('CLI entry point', () => {
  it('runs src/cli.ts through tsx in a real process', () => {
    const result = spawnSync(
      process.execPath,
      [require.resolve('tsx/cli'), 'src/cli.ts', '--help'],
      {
        cwd: APP_ROOT,
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('generate');
    expect(result.stdout).toContain('clean');
    expect(result.stdout).toContain('all');
  });
});
