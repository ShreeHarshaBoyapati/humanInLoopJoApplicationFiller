import Tag from '../entities/tag.js';
import { initializeDataSource } from '../data-source.js';
import { Repository } from 'typeorm';

export default function getTagRepository(): Repository<Tag> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Tag);
}
