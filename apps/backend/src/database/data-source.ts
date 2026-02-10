import { DataSource } from 'typeorm';
import entities from './entities/index.js';

let appDataSource: DataSource | null = null;
// TODO: need to use encryted password
// TODO: need to use the migrations

const initializeDataSource = () => {
  if (appDataSource) {
    return appDataSource;
  }

  const dbConfig = JSON.parse(process.env.NODE_DATABASE_CONFIG || '{}');

  appDataSource = new DataSource({
    type: 'postgres',
    synchronize: true,
    logging: false,
    entities: entities,
    subscribers: [],
    migrations: [],
    ...dbConfig,
  });
  return appDataSource;
};

export default initializeDataSource;
