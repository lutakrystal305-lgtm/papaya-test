import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import pino from 'pino';

import { CLI_LOG_LEVEL, DEFAULT_LOG_LEVEL, REQUEST_ID_HEADER, STDERR_FD } from './app.constants';

const prettyTransport = { target: 'pino-pretty', options: { singleLine: true } };

const resolveRequestId = (req: IncomingMessage, res: ServerResponse): string => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
};

export const httpLoggerParams = (config: ConfigService): Params => {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  return {
    pinoHttp: {
      level: config.get<string>('LOG_LEVEL', DEFAULT_LOG_LEVEL),
      genReqId: resolveRequestId,
      transport: isProduction ? undefined : prettyTransport,
    },
  };
};

// CLI mode: stdout is reserved for the Markdown report, so logs go to stderr.
export const cliLoggerParams = (): Params => ({
  pinoHttp: [{ level: CLI_LOG_LEVEL }, pino.destination(STDERR_FD)],
});
