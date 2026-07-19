import pino from 'pino';
import { env } from './env.js';

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname,time',
          hideObject: true,
        },
        }
      : undefined,
});

export default logger;
