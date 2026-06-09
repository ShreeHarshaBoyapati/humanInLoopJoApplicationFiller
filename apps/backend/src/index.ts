import './polyfills.js';
import 'reflect-metadata';

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express from 'express';
import { createServer } from 'http';
import type { Request, Response, NextFunction } from './types/index.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { LessThan } from 'typeorm';
import initializeDataSource from './database/data-source.js';
import routes from './routes/index.js';
import { getVerificationCodeRepository } from './database/repositories/index.js';
import { logger, httpLogger, staticConfig } from './utils/index.js';
import { attachWebSocketServer } from './realtime/ws-server.js';

const PORT = parseInt(process.env.NODE_PORT || '8000');
const isProduction = process.env.NODE_ENV === 'production';

function startVerificationCodeCleanupTimer() {
  const cleanupIntervalMs = staticConfig.auth.cleanupIntervalMinutes * 60 * 1000;

  const cleanupExpiredCodes = async () => {
    try {
      const repo = getVerificationCodeRepository();
      const now = new Date();
      const result = await repo.delete({ expiresAt: LessThan(now) });
      if (result.affected && result.affected > 0) {
        logger.info({ deletedCount: result.affected }, 'Cleaned up expired verification codes');
      }
    } catch (error) {
      logger.error({ err: error }, 'Error cleaning up expired verification codes');
    }
  };

  cleanupExpiredCodes();
  setInterval(cleanupExpiredCodes, cleanupIntervalMs);
  logger.info({ intervalMs: cleanupIntervalMs }, 'Verification code cleanup timer started');
}

async function initializeApp() {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const corsOrigin = process.env.NODE_CORS_ORIGIN || '*';
  const FRONTEND_ORIGIN = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : corsOrigin;
  logger.info({ FRONTEND_ORIGIN }, 'CORS origin(s) configured');

  const appDataSource = initializeDataSource();

  if (!appDataSource.isInitialized) {
    try {
      await appDataSource.initialize();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to Database');
      throw error;
    }
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.NODE_RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(helmet());
  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(limiter);
  app.use(cookieParser());
  app.use(httpLogger);
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
    });
  });

  app.use('/api', routes);

  if (isProduction) {
    const frontendPath = path.join(__dirname, '../../web/dist');
    app.use(express.static(frontendPath));
    app.get('{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
    logger.info({ path: frontendPath }, 'Serving frontend');
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).send({
      message: 'Internal Server Error',
      error: isProduction ? 'Internal Server Error' : err.message,
    });
  });

  const httpServer = createServer(app);
  attachWebSocketServer(httpServer);

  return { app, httpServer };
}

initializeApp()
  .then(({ httpServer }) => {
    startVerificationCodeCleanupTimer();
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Server started');
    });
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to initialize app');
    process.exit(1);
  });
