import type { CliIo } from '../../src/cli/run-cli';

export interface CapturedIo {
  io: CliIo;
  stdout(): string;
  stderr(): string;
}

export function captureIo(cwd: string): CapturedIo {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { cwd, stdout: (text) => out.push(text), stderr: (text) => err.push(text) },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  };
}
