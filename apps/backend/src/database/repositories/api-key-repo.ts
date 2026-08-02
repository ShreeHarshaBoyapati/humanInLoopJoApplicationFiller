import { initializeDataSource } from '../data-source.js';
import ApiKey from '../entities/api-key.js';

const getApiKeyRepository = () => {
  const dataSource = initializeDataSource();
  if (!dataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return dataSource.getRepository(ApiKey);
};

export default getApiKeyRepository;
