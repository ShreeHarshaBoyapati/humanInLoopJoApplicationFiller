import type { Response, AuthenticatedRequest } from '../types/index.js';
import { getJobRepository, getUserRepository } from '../database/repositories/index.js';
import type {
  CreateJobInput,
  UpdateJobInput,
  DeleteJobInput,
  GetJobsInput,
} from '../middlewares/job.js';

class JobController {
  async create(req: AuthenticatedRequest, res: Response) {
    const jobRepository = getJobRepository();
    const userRepository = getUserRepository();

    const userId = req.userId;

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const jobData: CreateJobInput = req.body;

    const job = jobRepository.create({
      ...jobData,
      user,
    });

    await jobRepository.save(job);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: {
        id: job.id,
      },
    });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const jobRepository = getJobRepository();

    const userId = req.userId;

    const { id, ...updateData }: UpdateJobInput = req.body;

    const job = await jobRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    if (job.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this job',
      });
      return;
    }

    Object.assign(job, updateData);

    await jobRepository.save(job);

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: {
        id: job.id,
      },
    });
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const jobRepository = getJobRepository();

    const userId = req.userId;

    const { id }: DeleteJobInput = req.body;

    const job = await jobRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    if (job.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this job',
      });
      return;
    }

    await jobRepository.remove(job);

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  }

  // Pagination, filtering by status/persona, searching by title/companyName/keySkills/tags,
  // sorting by createdAt/updatedAt/acceptanceLevel, field selection
  async get(req: AuthenticatedRequest, res: Response) {
    const jobRepository = getJobRepository();

    const userId = req.userId;

    const { page, limit, status, persona, search, sortBy, sortOrder, select } = (
      req as AuthenticatedRequest & { parsedQuery: GetJobsInput }
    ).parsedQuery;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Default fields if none specified
    const defaultFields = [
      'id',
      'title',
      'tags',
      'persona',
      'status',
      'acceptanceLevel',
      'companyName',
      'metaData',
      'description',
      'highlights',
      'keySkills',
      'createdAt',
      'updatedAt',
    ];

    const fieldsToSelect = select && select.length > 0 ? select : defaultFields;

    const queryBuilder = jobRepository
      .createQueryBuilder('job')
      .select(fieldsToSelect.map((field) => `job.${field}`))
      .leftJoin('job.user', 'user')
      .where('user.id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (persona) {
      queryBuilder.andWhere('job.persona = :persona', { persona });
    }

    if (search) {
      queryBuilder.andWhere(
        '(job.title LIKE :search OR job.companyName LIKE :search OR job.keySkills LIKE :search OR job.tags LIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy(`job.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
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
    });
  }
}

export default new JobController();
