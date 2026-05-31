import Result from '../entities/result.js';
import initializeDataSource from '../data-source.js';
import { Repository } from 'typeorm';

export default function getResultRepository(): Repository<Result> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Result);
}
