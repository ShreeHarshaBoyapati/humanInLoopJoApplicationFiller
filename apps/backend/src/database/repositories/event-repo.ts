import Event from '../entities/event.js';
import { initializeDataSource } from '../data-source.js';
import { Repository } from 'typeorm';

export default function getEventRepository(): Repository<Event> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Event);
}
