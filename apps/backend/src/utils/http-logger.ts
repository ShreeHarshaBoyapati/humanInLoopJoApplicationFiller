import pinoHttpModule from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import { logger } from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';

const PinoHttp = 'default' in pinoHttpModule ? pinoHttpModule.default : pinoHttpModule;

export const httpLogger = PinoHttp({
  logger,
  serializers: {
    req: (req: IncomingMessage & { method?: string; url?: string }) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse & { statusCode: number }) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err: Error | undefined) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse, _responseTime: number) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (_req: IncomingMessage, res: ServerResponse, err: Error) => {
    return `Request failed with status ${res.statusCode}: ${err.message}`;
  },
  // Auto-logging settings
  autoLogging: {
    ignore: (req: IncomingMessage) => {
      // Don't log health check requests in production
      if (isProduction && req.url === '/health') return true;
      return false;
    },
  },
});

export default httpLogger;
