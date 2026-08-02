import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import entities from './entities/index.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../../.env') });

let appDataSource: DataSource | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

const dbConfig = JSON.parse(process.env.NODE_DATABASE_CONFIG || '{}');

const createDataSource = (): DataSource =>
  new DataSource({
    type: 'postgres',
    synchronize: !isProduction,
    logging: false,
    entities: entities,
    subscribers: [],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: false,
    ...dbConfig,
  });

/**
 * Returns the singleton DataSource used by the application.
 * Multiple calls return the same instance.
 */
export const initializeDataSource = (): DataSource => {
  if (!appDataSource) {
    appDataSource = createDataSource();
  }
  return appDataSource;
};

/**
 * CLI-compatible default export: a freshly-created DataSource instance.
 * TypeORM commands (migration:generate, migration:run, etc.) load this file
 * directly and require a DataSource as the default export.
 */
export default createDataSource();
