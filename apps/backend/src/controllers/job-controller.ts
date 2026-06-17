import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import {
  getJobRepository,
  getUserRepository,
  getPersonaRepository,
  getResultRepository,
} from '../database/repositories/index.js';
import { logger } from '../utils/index.js';
import type {
  CreateJobInput,
  UpdateJobInput,
  DeleteJobInput,
  GetJobsInfer,
} from '../middlewares/job.js';
import { ApiResponse, JobList, Job, type JobStatus } from '@repo/shared-types';
import type { StatusUpdatedAtMap, StatusUpdatedAtKey } from '../database/entities/job.js';
import * as wsHub from '../realtime/ws-hub.js';
import { jobToPublic } from '../realtime/payload-mappers.js';

const ARCHIVED_STATUSES: JobStatus[] = ['offer', 'rejected'];

const STATUS_ORDER: StatusUpdatedAtKey[] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

function emptyStatusUpdatedAt(): StatusUpdatedAtMap {
  return {
    draft: null,
    applied: null,
    interview: null,
    offer: null,
    rejected: null,
  };
}

function recomputeStatusUpdatedAt(
  current: StatusUpdatedAtMap,
  newStatus: JobStatus
): StatusUpdatedAtMap {
  const next: StatusUpdatedAtMap = { ...current };
  next[newStatus] = new Date();
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  for (let i = newIdx + 1; i < STATUS_ORDER.length; i++) {
    const key = STATUS_ORDER[i] as StatusUpdatedAtKey;
    next[key] = null;
  }
  return next;
}

class JobController {
  async create(req: AuthenticatedTypedRequest<CreateJobInput>, res: Response) {
    const jobRepository = getJobRepository();
    const userRepository = getUserRepository();
    const personaRepository = getPersonaRepository();

    const userId = req.userId;

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const { personaId, ...jobData } = req.body;

    // Validate persona exists if provided
    if (personaId) {
      const persona = await personaRepository.findOne({
        where: { id: personaId },
        relations: ['user'],
      });
      if (!persona || persona.user.id !== userId) {
        const data: ApiResponse = {
          success: false,
          message: 'Persona not found or not authorized',
        };
        res.status(400).json(data);
        return;
      }
    }

    const job = jobRepository.create({
      ...jobData,
      personaId: personaId || null,
      user,
      dataUpdatedAt: new Date(),
      statusUpdatedAt: emptyStatusUpdatedAt(),
    });
    job.statusUpdatedAt.draft = job.dataUpdatedAt;

    await jobRepository.save(job);

    wsHub.emit(userId, 'job', 'create', job.id, jobToPublic(job), undefined, req.realtimeClientId);

    const data: ApiResponse<{ id: string }> = {
      success: true,
      message: 'Job created successfully',
      data: {
        id: job.id,
      },
    };
    res.status(201).json(data);
  }

  async update(req: AuthenticatedTypedRequest<UpdateJobInput>, res: Response) {
    const jobRepository = getJobRepository();
    const personaRepository = getPersonaRepository();

    const userId = req.userId;

    const { id, primaryResultId, personaId, ...updateData } = req.body;

    const job = await jobRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!job) {
      const data: ApiResponse = {
        success: false,
        message: 'Job not found',
      };
      res.status(404).json(data);
      return;
    }

    if (job.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'You are not authorized to update this job',
      };
      res.status(403).json(data);
      return;
    }

    // Handle personaId - validate and set
    if (personaId !== undefined) {
      if (personaId === null) {
        job.personaId = null;
      } else {
        const persona = await personaRepository.findOne({
          where: { id: personaId },
          relations: ['user'],
        });
        if (!persona || persona.user.id !== userId) {
          const data: ApiResponse = {
            success: false,
            message: 'Persona not found or not authorized',
          };
          res.status(400).json(data);
          return;
        }
        job.personaId = personaId;
      }
    }

    // Handle primaryResultId - fetch result and update persona
    if (primaryResultId !== undefined) {
      if (primaryResultId === null) {
        job.primaryResultId = null;
      } else {
        const resultRepository = getResultRepository();
        const result = await resultRepository.findOne({
          where: { id: primaryResultId },
          relations: ['resumeVersion', 'resumeVersion.resume', 'resumeVersion.resume.persona'],
        });
        if (!result) {
          const data: ApiResponse = {
            success: false,
            message: 'Result not found',
          };
          res.status(400).json(data);
          return;
        }
        job.primaryResultId = primaryResultId;
        job.personaId = result.resumeVersion.resume.persona.id;
      }
    }

    Object.assign(job, updateData);

    if (updateData.status !== undefined && updateData.status !== job.status) {
      const current = (job.statusUpdatedAt as StatusUpdatedAtMap) || emptyStatusUpdatedAt();
      job.statusUpdatedAt = recomputeStatusUpdatedAt(current, updateData.status);
    }

    const nonContentFields = [
      'personaId',
      'status',
      'acceptanceLevel',
      'favorite',
      'primaryResultId',
    ];
    const updateKeys = Object.keys(updateData);
    const hasContentFields = updateKeys.some((key) => !nonContentFields.includes(key));

    if (hasContentFields) {
      job.dataUpdatedAt = new Date();
    }

    await jobRepository.save(job);

    wsHub.emit(userId, 'job', 'update', job.id, jobToPublic(job), undefined, req.realtimeClientId);

    const data: ApiResponse<Job> = {
      success: true,
      data: job,
    };
    res.status(200).json(data);
  }

  async delete(req: AuthenticatedTypedRequest<DeleteJobInput>, res: Response) {
    const jobRepository = getJobRepository();

    const userId = req.userId;

    const { id } = req.body;

    const job = await jobRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!job) {
      const data: ApiResponse = {
        success: false,
        message: 'Job not found',
      };
      res.status(404).json(data);
      return;
    }

    if (job.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'You are not authorized to delete this job',
      };
      res.status(403).json(data);
      return;
    }

    if (req.clientAborted) {
      logger.info({ id: job.id }, 'Delete job aborted by client; skipping DB write');
      return;
    }

    await jobRepository.remove(job);

    wsHub.emit(userId, 'job', 'delete', id, undefined, undefined, req.realtimeClientId);

    const data: ApiResponse = {
      success: true,
      message: 'Job deleted successfully',
    };

    res.status(200).json(data);
  }

  // Pagination, filtering by status/persona/favorite, searching by title/companyName/keySkills/tags,
  // sorting by createdAt/updatedAt/acceptanceLevel, field selection
  async get(req: AuthenticatedTypedRequest<null>, res: Response) {
    const jobRepository = getJobRepository();

    const userId = req.userId;

    const { page, limit, status, persona, search, sortBy, sortOrder, select, id, favorite } = (
      req as AuthenticatedTypedRequest<null> & { parsedQuery: GetJobsInfer }
    ).parsedQuery;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Default fields if none specified
    const defaultFields = [
      'id',
      'title',
      'tags',
      'personaId',
      'status',
      'acceptanceLevel',
      'companyName',
      'metaData',
      'description',
      'requirements',
      'keySkills',
      'favorite',
      'notes',
      'primaryResultId',
      'dataUpdatedAt',
      'statusUpdatedAt',
      'createdAt',
      'updatedAt',
    ];

    const fieldsToSelect = select && select.length > 0 ? select : defaultFields;

    const queryBuilder = jobRepository
      .createQueryBuilder('job')
      .select(fieldsToSelect.map((field) => `job.${field}`))
      .leftJoin('job.user', 'user')
      .where('user.id = :userId', { userId });

    if (id) {
      queryBuilder.andWhere('job.id = :id', { id });
    }

    if (status) {
      if (status === ('active' as JobStatus)) {
        queryBuilder.andWhere('job.status NOT IN (:...archivedStatuses)', {
          archivedStatuses: ARCHIVED_STATUSES,
        });
      } else if (status === ('archived' as JobStatus)) {
        queryBuilder.andWhere('job.status IN (:...archivedStatuses)', {
          archivedStatuses: ARCHIVED_STATUSES,
        });
      } else {
        queryBuilder.andWhere('job.status = :status', { status });
      }
    }

    if (persona) {
      queryBuilder.andWhere('job.personaId = :persona', { persona });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      queryBuilder.andWhere(
        '(LOWER(job.title) LIKE :search OR LOWER(job.companyName) LIKE :search OR LOWER(job.keySkills) LIKE :search OR LOWER(job.tags) LIKE :search)',
        { search: `%${searchLower}%` }
      );
    }

    if (favorite !== undefined) {
      queryBuilder.andWhere('job.favorite = :favorite', { favorite });
    }

    queryBuilder.orderBy(`job.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    const data: ApiResponse<JobList> = {
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };
    res.status(200).json(data);
  }
}

export default new JobController();
