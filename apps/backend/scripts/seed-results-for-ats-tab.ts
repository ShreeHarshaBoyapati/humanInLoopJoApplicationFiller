import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataSource, Repository } from 'typeorm';
import initializeDataSource from '../src/database/data-source.js';
import User from '../src/database/entities/user.js';
import Job from '../src/database/entities/job.js';
import Persona from '../src/database/entities/persona.js';
import Resume from '../src/database/entities/resume.js';
import ResumeVersion from '../src/database/entities/resume-version.js';
import Result from '../src/database/entities/result.js';

const SEED_JOB_TITLE = '[SEED] ATS Tab Test Job';
const SEED_PERSONA_TITLE_PREFIX = '[SEED] Persona';
const SEED_RESUME_FILE_PREFIX = '[SEED] Candidate';
const SEED_VERSION_PREFIX = 'v';
const RESULTS_PER_JOB = 50;
const JOB_COUNT = 2;
const RESUMES_PER_PERSONA = 5;
const VERSIONS_PER_RESUME = 10;

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

async function getRepositories(dataSource: DataSource) {
  return {
    userRepository: dataSource.getRepository(User),
    jobRepository: dataSource.getRepository(Job),
    personaRepository: dataSource.getRepository(Persona),
    resumeRepository: dataSource.getRepository(Resume),
    resumeVersionRepository: dataSource.getRepository(ResumeVersion),
    resultRepository: dataSource.getRepository(Result),
  };
}

async function cleanPreviousSeed(
  repositories: ReturnType<typeof getRepositories> extends Promise<infer T> ? T : never
) {
  const {
    jobRepository,
    personaRepository,
    resumeRepository,
    resumeVersionRepository,
    resultRepository,
  } = repositories;

  const seedJobs = await jobRepository.find({
    where: { title: SEED_JOB_TITLE },
  });

  if (seedJobs.length > 0) {
    const jobIds = seedJobs.map((job) => job.id);
    await resultRepository.delete({ jobId: jobIds as unknown as string });
    await jobRepository.remove(seedJobs);
    console.log(`Cleaned ${seedJobs.length} seed jobs and their results.`);
  }

  const seedResumes = await resumeRepository
    .createQueryBuilder('resume')
    .where('resume.fileName LIKE :prefix', { prefix: `${SEED_RESUME_FILE_PREFIX}%` })
    .getMany();

  if (seedResumes.length > 0) {
    const resumeIds = seedResumes.map((resume) => resume.id);
    await resumeVersionRepository
      .createQueryBuilder()
      .delete()
      .where('resumeId IN (:...resumeIds)', { resumeIds })
      .execute();
    await resumeRepository.remove(seedResumes);
    console.log(`Cleaned ${seedResumes.length} seed resumes and their versions.`);
  }

  const seedPersonas = await personaRepository.find({
    where: { title: SEED_PERSONA_TITLE_PREFIX },
  });

  if (seedPersonas.length > 0) {
    await personaRepository.remove(seedPersonas);
    console.log(`Cleaned ${seedPersonas.length} seed personas.`);
  }
}

function createDummyPdfBuffer(): Buffer {
  // Minimal valid-looking PDF header so the DB accepts the bytea column.
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF', 'utf-8');
}

async function seed() {
  const dataSource = initializeDataSource();
  dataSource.setOptions(getDataSourceConfig());

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  console.log('Database connected.');

  const repositories = await getRepositories(dataSource);
  await cleanPreviousSeed(repositories);

  const {
    userRepository,
    jobRepository,
    personaRepository,
    resumeRepository,
    resumeVersionRepository,
    resultRepository,
  } = repositories;

  const user = await userRepository.findOne({ where: {} });
  if (!user) {
    throw new Error('No existing user found in the database. Please create a user first.');
  }

  console.log(`Using existing user: ${user.email} (${user.id})`);

  const personas: Persona[] = [];
  for (let p = 1; p <= 2; p++) {
    const persona = personaRepository.create({
      title: `${SEED_PERSONA_TITLE_PREFIX} ${p}`,
      keywords: [],
      active: true,
      isDeleted: false,
      user,
    });
    const savedPersona = await personaRepository.save(persona);
    personas.push(savedPersona);
    console.log(`Created persona ${savedPersona.title} (${savedPersona.id})`);
  }

  const allVersions: ResumeVersion[] = [];
  const dummyFile = createDummyPdfBuffer();

  for (const persona of personas) {
    for (let r = 1; r <= RESUMES_PER_PERSONA; r++) {
      const resume = resumeRepository.create({
        fileName: `${SEED_RESUME_FILE_PREFIX} ${r} - ${persona.title}`,
        active: true,
        isDeleted: false,
        persona,
      });
      const savedResume = await resumeRepository.save(resume);

      for (let v = 1; v <= VERSIONS_PER_RESUME; v++) {
        const versionNumber = (r - 1) * VERSIONS_PER_RESUME + v;
        const version = resumeVersionRepository.create({
          file: dummyFile,
          fileSize: dummyFile.length,
          active: true,
          parsedData: null,
          versionName: `${SEED_VERSION_PREFIX}${versionNumber}`,
          comment: null,
          keywords: [],
          dataUpdatedAt: null,
          isDeleted: false,
          resume: savedResume,
        });
        const savedVersion = await resumeVersionRepository.save(version);
        allVersions.push(savedVersion);
      }
    }
  }

  console.log(`Created ${allVersions.length} resume versions.`);

  // Shuffle versions deterministically so both jobs use the same pool but assign different versions where possible.
  // We have 100 versions total, and we need 50 per job. Use first half for job 1 and second half for job 2.
  const versionsForJob1 = allVersions.slice(0, RESULTS_PER_JOB);
  const versionsForJob2 = allVersions.slice(RESULTS_PER_JOB, RESULTS_PER_JOB * 2);

  const versionGroups = [versionsForJob1, versionsForJob2];

  const createdJobs: Job[] = [];
  for (let j = 1; j <= JOB_COUNT; j++) {
    const job = jobRepository.create({
      title: SEED_JOB_TITLE,
      tags: [],
      personaId: null,
      persona: null,
      status: 'active',
      acceptanceLevel: 0,
      companyName: 'Seed Company',
      notes: '',
      requirements: '',
      metaData: { seed: true, jobIndex: j },
      description: '',
      keySkills: [],
      favorite: false,
      dataUpdatedAt: null,
      statusUpdatedAt: {} as Record<string, Date | null>,
      user,
      primaryResultId: null,
    });
    const savedJob = await jobRepository.save(job);
    createdJobs.push(savedJob);

    const versionsForJob = versionGroups[j - 1];
    const now = new Date();

    for (let i = 0; i < RESULTS_PER_JOB; i++) {
      const version = versionsForJob[i];
      const candidateNumber = RESULTS_PER_JOB - i;
      const createdAt = new Date(now.getTime() - i * 1000);

      const result = resultRepository.create({
        jobId: savedJob.id,
        job: savedJob,
        resumeVersionId: version.id,
        resumeVersion: version,
        score: candidateNumber,
        breakdown: {
          missingFields: [],
          highlyMatchedKeys: ['seed'],
          suggestions: [`Seed result ${candidateNumber}`],
          overallVerdict: `Seed result ${candidateNumber}`,
        },
        createdAt,
      });
      await resultRepository.save(result);
    }

    console.log(`Created job ${j} (${savedJob.id}) with ${RESULTS_PER_JOB} results.`);
  }

  console.log('\nSeed complete.');
  console.log('Job IDs:');
  createdJobs.forEach((job, index) => {
    console.log(`  ${index + 1}. ${job.id}`);
  });
  console.log(`Total results created: ${JOB_COUNT * RESULTS_PER_JOB}`);

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
