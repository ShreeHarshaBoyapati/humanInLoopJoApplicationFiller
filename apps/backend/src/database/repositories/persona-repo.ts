import Persona from '../entities/persona.js';
import { initializeDataSource } from '../data-source.js';
import { Repository } from 'typeorm';

export default function getPersonaRepository(): Repository<Persona> {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(Persona);
}
