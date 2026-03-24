import Resume from '../entities/resume.js';
import initializeDataSource from '../data-source.js';
import { Repository } from 'typeorm';

export default function getResumeRepository(): Repository<Resume> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Resume);
}
