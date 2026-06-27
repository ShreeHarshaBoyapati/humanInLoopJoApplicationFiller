import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from 'typeorm';
import initializeDataSource from '../src/database/data-source.js';
import User from '../src/database/entities/user.js';
import Job from '../src/database/entities/job.js';
import Persona from '../src/database/entities/persona.js';
import Event from '../src/database/entities/event.js';
import Result from '../src/database/entities/result.js';

// Seed constants
const SEED_JOB_TITLE_PREFIX = '[SEED-JTP]';
const SEED_PERSONA_TITLE_PREFIX = '[SEED-JTP] Persona';
const JOB_COUNT = 60;
const PERSONA_COUNT = 2;

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

type StatusUpdatedAtMap = {
  draft: Date | null;
  applied: Date | null;
  interview: Date | null;
  offer: Date | null;
  rejected: Date | null;
};

function emptyStatusUpdatedAt(): StatusUpdatedAtMap {
  return {
    draft: null,
    applied: null,
    interview: null,
    offer: null,
    rejected: null,
  };
}

const STATUSES: Job['status'][] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

const ACCEPTANCE_LEVELS = [0, 25, 50, 75, 100];

function formatDate(date: Date): string {
  const iso = date.toISOString();
  return iso.split('T')[0].replaceAll('-', '');
}

function buildJobTitle(
  index: number,
  personaIndex: number,
  acceptanceLevel: number,
  updatedAt: Date,
  status: string,
  favorite: boolean
): string {
  const datePart = formatDate(updatedAt);
  const statusPart = status;
  return `${SEED_JOB_TITLE_PREFIX} Job ${String(index).padStart(2, '0')}-P${personaIndex + 1}-A${acceptanceLevel}-U${datePart}-S${statusPart}-F${favorite ? 1 : 0}`;
}

function getRepositories(dataSource: DataSource) {
  return {
    userRepository: dataSource.getRepository(User),
    jobRepository: dataSource.getRepository(Job),
    personaRepository: dataSource.getRepository(Persona),
    eventRepository: dataSource.getRepository(Event),
    resultRepository: dataSource.getRepository(Result),
  };
}

async function cleanPreviousSeed(dataSource: DataSource) {
  const { jobRepository, personaRepository, eventRepository, resultRepository } =
    getRepositories(dataSource);

  const seedJobs = await jobRepository
    .createQueryBuilder('job')
    .where('job.title LIKE :prefix', { prefix: `${SEED_JOB_TITLE_PREFIX}%` })
    .getMany();

  if (seedJobs.length > 0) {
    const jobIds = seedJobs.map((job) => job.id);

    await eventRepository
      .createQueryBuilder()
      .delete()
      .where('jobId IN (:...jobIds)', { jobIds })
      .execute();

    await resultRepository
      .createQueryBuilder()
      .delete()
      .where('jobId IN (:...jobIds)', { jobIds })
      .execute();

    await jobRepository.remove(seedJobs);
    console.log(`Cleaned ${seedJobs.length} previous seed jobs plus their events and results.`);
  }

  const seedPersonas = await personaRepository
    .createQueryBuilder('persona')
    .where('persona.title LIKE :prefix', { prefix: `${SEED_PERSONA_TITLE_PREFIX}%` })
    .getMany();

  if (seedPersonas.length > 0) {
    await personaRepository.remove(seedPersonas);
    console.log(`Cleaned ${seedPersonas.length} previous seed personas.`);
  }
}

async function seed() {
  const dataSource = initializeDataSource();
  dataSource.setOptions(getDataSourceConfig());

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  console.log('Database connected.');

  const repositories = getRepositories(dataSource);
  await cleanPreviousSeed(dataSource);

  const { userRepository, jobRepository, personaRepository } = repositories;

  const user = await userRepository.findOne({ where: {} });
  if (!user) {
    throw new Error('No existing user found in the database. Please create a user first.');
  }

  console.log(`Using existing user: ${user.email} (${user.id})`);

  const personas: Persona[] = [];
  for (let p = 0; p < PERSONA_COUNT; p++) {
    const persona = personaRepository.create({
      title: `${SEED_PERSONA_TITLE_PREFIX} ${p + 1}`,
      keywords: [],
      active: true,
      isDeleted: false,
      user,
    });
    const savedPersona = await personaRepository.save(persona);
    personas.push(savedPersona);
    console.log(`Created persona ${savedPersona.title} (${savedPersona.id})`);
  }

  const now = new Date();
  const baseCreatedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const createdJobs: Job[] = [];

  for (let i = 1; i <= JOB_COUNT; i++) {
    const personaIndex = (i - 1) % PERSONA_COUNT;
    const persona = personas[personaIndex];
    const acceptanceLevel = ACCEPTANCE_LEVELS[(i - 1) % ACCEPTANCE_LEVELS.length];
    const status = STATUSES[(i - 1) % STATUSES.length];
    const favorite = i % 5 === 0;

    // Spread createdAt across 30 days; more recent jobs have higher index.
    const createdAt = new Date(baseCreatedAt.getTime() + i * 12 * 60 * 60 * 1000);
    // updatedAt is a bit later than createdAt and also varies so sorting by updatedAt is distinguishable.
    const updatedAt = new Date(createdAt.getTime() + (i % 7) * 60 * 60 * 1000);
    const dataUpdatedAt = new Date(updatedAt.getTime());

    const title = buildJobTitle(i, personaIndex, acceptanceLevel, dataUpdatedAt, status, favorite);

    const statusUpdatedAt = emptyStatusUpdatedAt();
    statusUpdatedAt[status as keyof StatusUpdatedAtMap] = new Date(updatedAt.getTime());

    const job = jobRepository.create({
      title,
      tags: ['seed', 'pagination-test'],
      personaId: persona.id,
      persona,
      status,
      acceptanceLevel,
      companyName: 'Seed Company',
      notes: `Seed job ${i} for Job Tracker pagination/filter testing.`,
      requirements: 'Seed requirements',
      metaData: { seedSource: 'job-tracker-pagination', jobIndex: i },
      description: `Seed job ${i}`,
      keySkills: ['seed-skill'],
      favorite,
      dataUpdatedAt,
      statusUpdatedAt,
      user,
      primaryResultId: null,
    });

    // TypeORM @CreateDateColumn/@UpdateDateColumn auto-set these, but we want deterministic values.
    const savedJob = await jobRepository.save(job);

    // Force createdAt/updatedAt to deterministic values via raw query since TypeORM may override them on save.
    await dataSource
      .createQueryBuilder()
      .update(Job)
      .set({ createdAt, updatedAt })
      .where('id = :id', { id: savedJob.id })
      .execute();

    createdJobs.push(savedJob);
  }

  console.log(`\nSeed complete. Created ${createdJobs.length} jobs.`);
  console.log('Sample titles:');
  createdJobs.slice(0, 5).forEach((job) => {
    console.log(`  - ${job.title}`);
  });
  console.log('Persona IDs:');
  personas.forEach((persona) => {
    console.log(`  - ${persona.title}: ${persona.id}`);
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
