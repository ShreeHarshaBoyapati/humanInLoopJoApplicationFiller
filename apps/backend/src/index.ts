import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express from 'express';
import type { Request, Response, NextFunction } from './types/index.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import initializeDataSource from './database/data-source.js';
import routes from './routes/index.js';
import { logger, httpLogger } from './utils/index.js';

let app: express.Application | null = null;
const PORT = parseInt(process.env.NODE_PORT || '8000');
const isProduction = process.env.NODE_ENV === 'production';

async function initializeApp() {
  app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const FRONTEND_ORIGIN = process.env.NODE_CORS_ORIGIN || '*';

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
  app.use(limiter);
  app.use(cookieParser());
  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
    })
  );
  app.use(httpLogger);
  app.use(express.json());

  // ===== API Routes =====

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
    });
  });

  // Mount all API routes
  app.use('/api', routes);

  // ===== Production: Serve Frontend =====
  if (isProduction) {
    // Path to the built frontend files
    const frontendPath = path.join(__dirname, '../../web/dist');

    // Serve static files from the frontend build
    app.use(express.static(frontendPath));
    // TODO: all remain apart from /api.
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
}

initializeApp()
  .then(() => {
    app?.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Server started');
    });
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to initialize app');
    process.exit(1);
  });
