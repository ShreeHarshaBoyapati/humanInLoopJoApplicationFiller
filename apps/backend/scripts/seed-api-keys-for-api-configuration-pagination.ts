import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from 'typeorm';
import { initializeDataSource } from '../src/database/data-source.js';
import User from '../src/database/entities/user.js';
import ApiKey from '../src/database/entities/api-key.js';
import { encryptText } from '../src/utils/encryption.js';
import type { Repository } from 'typeorm';
import type { ProviderName } from '../src/services/ai/registry.js';

const SEED_MODEL_PREFIX = '[SEED-API-CFG]';
const SEED_USER_ID = 'f885cd3a-3312-409a-b9b7-18f1f5e85aad';

// Distribution chosen so search by partial provider name (e.g. "open", "an", "gro", "gem", "oll")
// returns multiple pages, while a non-matching term like "xyz" returns none.
const PROVIDER_DISTRIBUTION: { provider: ProviderName; count: number }[] = [
  { provider: 'gemini', count: 10 },
  { provider: 'openai', count: 10 },
  { provider: 'anthropic', count: 9 },
  { provider: 'groq', count: 8 },
  { provider: 'mistral', count: 7 },
  { provider: 'ollama', count: 6 },
  { provider: 'custom', count: 5 },
];

const MODEL_FOR_PROVIDER: Record<ProviderName, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  ollama: ['llama3.1', 'mistral', 'phi3'],
  custom: ['custom-model'],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function getDataSourceConfig() {
  const rawConfig = process.env.NODE_DATABASE_CONFIG;
  if (!rawConfig) {
    throw new Error('NODE_DATABASE_CONFIG is not defined in environment');
  }
  return JSON.parse(rawConfig);
}

function encryptCredential(value: string, keyName: string): string {
  if (
    keyName.toLowerCase().includes('key') ||
    keyName.toLowerCase().includes('secret') ||
    keyName.toLowerCase().includes('token')
  ) {
    return encryptText(value);
  }
  return value;
}

function buildCredentials(provider: ProviderName): Record<string, string> {
  const baseKey = `seed-${provider}-api-key-${Math.random().toString(36).slice(2, 10)}`;
  switch (provider) {
    case 'custom':
      return {
        apiKey: encryptCredential(baseKey, 'apiKey'),
        customUrl: 'https://api.example-provider.com/v1',
      };
    case 'ollama':
      return {
        customUrl: 'http://localhost:11434',
      };
    case 'openai':
      return {
        apiKey: encryptCredential(baseKey, 'apiKey'),
        organizationId: `org-seed-${Math.random().toString(36).slice(2, 8)}`,
        projectId: `proj-seed-${Math.random().toString(36).slice(2, 8)}`,
      };
    default:
      return { apiKey: encryptCredential(baseKey, 'apiKey') };
  }
}

async function cleanPreviousSeed(apiKeyRepository: Repository<ApiKey>) {
  const seedKeys = await apiKeyRepository
    .createQueryBuilder('key')
    .where('key.model LIKE :prefix', { prefix: `${SEED_MODEL_PREFIX}%` })
    .getMany();

  if (seedKeys.length > 0) {
    await apiKeyRepository.remove(seedKeys);
    console.log(`Cleaned ${seedKeys.length} previous seed api keys.`);
  }
}

async function seed() {
  const dataSource = initializeDataSource();
  dataSource.setOptions(getDataSourceConfig());

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  console.log('Database connected.');

  const userRepository = dataSource.getRepository(User);
  const apiKeyRepository = dataSource.getRepository(ApiKey);

  await cleanPreviousSeed(apiKeyRepository);

  const user = await userRepository.findOne({ where: { id: SEED_USER_ID } });
  if (!user) {
    throw new Error(`User with id ${SEED_USER_ID} not found. Please create the user first.`);
  }
  console.log(`Using user: ${user.email} (${user.id})`);

  const now = new Date();
  const baseCreatedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const planned: { provider: ProviderName; count: number }[] = PROVIDER_DISTRIBUTION;
  const totalCount = planned.reduce((acc, p) => acc + p.count, 0);

  const createdKeys: ApiKey[] = [];
  let index = 0;

  for (const { provider, count } of planned) {
    const modelPool = MODEL_FOR_PROVIDER[provider];
    for (let i = 0; i < count; i++) {
      index += 1;
      const padded = String(index).padStart(2, '0');
      const realModel = modelPool[i % modelPool.length];
      const modelName = `${SEED_MODEL_PREFIX} ${realModel} #${padded}`;

      const createdAt = new Date(baseCreatedAt.getTime() + index * 12 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + (index % 7) * 60 * 60 * 1000);

      const apiKey = apiKeyRepository.create({
        provider,
        model: modelName,
        credentials: buildCredentials(provider),
        active: index === 1,
        user,
      });

      const saved = await apiKeyRepository.save(apiKey);

      // Force deterministic createdAt/updatedAt so DESC ordering is stable across re-runs.
      await dataSource
        .createQueryBuilder()
        .update(ApiKey)
        .set({ createdAt, updatedAt })
        .where('id = :id', { id: saved.id })
        .execute();

      createdKeys.push(saved);
    }
  }

  console.log(`\nSeed complete. Created ${createdKeys.length} api keys for user ${user.id}.`);
  console.log('Per-provider counts:');
  planned.forEach(({ provider, count }) => {
    console.log(`  - ${provider}: ${count}`);
  });
  console.log('Sample models (first 5):');
  createdKeys.slice(0, 5).forEach((k) => {
    console.log(`  - ${k.model}`);
  });

  await dataSource.destroy();
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
