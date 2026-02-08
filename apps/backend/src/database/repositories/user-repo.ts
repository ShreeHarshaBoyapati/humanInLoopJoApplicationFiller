import User from '../entities/user.js';
import initializeDataSource from '../data-source.js';
import { Repository } from 'typeorm';

export default function getUserRepository(): Repository<User> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(User);
}
