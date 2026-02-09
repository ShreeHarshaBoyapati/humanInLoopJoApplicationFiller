import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const redactPaths = [...(isProduction ? ['error.stack'] : [])];

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});

export default logger;
