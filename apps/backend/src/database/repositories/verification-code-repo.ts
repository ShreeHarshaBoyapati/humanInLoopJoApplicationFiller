import VerificationCode from '../entities/verification-code.js';
import { initializeDataSource } from '../data-source.js';
import { Repository } from 'typeorm';

export default function getVerificationCodeRepository(): Repository<VerificationCode> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(VerificationCode);
}
