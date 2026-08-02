import 'reflect-metadata';
import { initializeDataSource } from './data-source.js';

/**
 * Standalone migration runner used in production deploys.
 * Initializes the TypeORM DataSource and runs pending migrations.
 * Exits with code 1 on error so container orchestrators can surface failure.
 */
const runMigrations = async (): Promise<void> => {
  const dataSource = initializeDataSource();

  try {
    await dataSource.initialize();
    const appliedMigrations = await dataSource.runMigrations({ transaction: 'all' });
    console.log(`Applied ${appliedMigrations.length} migration(s):`);
    for (const migration of appliedMigrations) {
      console.log(`  - ${migration.name}`);
    }
  } catch (error) {
    console.error('Migration run failed:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

void runMigrations();
