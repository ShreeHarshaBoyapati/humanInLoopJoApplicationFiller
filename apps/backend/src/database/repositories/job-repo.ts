import Job from '../entities/job.js';
import initializeDataSource from '../data-source.js';
import { Repository } from 'typeorm';

export default function getJobRepository(): Repository<Job> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Job);
}
