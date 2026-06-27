import ResumeVersion from '../entities/resume-version.js';
import initializeDataSource from '../data-source.js';
import { Repository } from 'typeorm';

export default function getResumeVersionRepository(): Repository<ResumeVersion> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(ResumeVersion);
}
