import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getResultRepository, getJobRepository } from '../database/repositories/index.js';
import { ApiResponse } from '@repo/shared-types';
import type {
  PaginatedResultListItem,
  PaginatedResultResponse,
  ResultDetail,
} from '@repo/shared-types';

interface GetResultsQuery {
  page?: string;
  limit?: string;
  search?: string;
}

class ResultController {
  /**
   * Get paginated results for a job
   */
  async getByJobId(
    req: AuthenticatedTypedRequest<null> & { params: { jobId: string }; query: GetResultsQuery },
    res: Response
  ) {
    const resultRepository = getResultRepository();
    const jobRepository = getJobRepository();

    const userId = req.userId;
    const jobId = req.params.jobId as string;
    const { page: pageParam, limit: limitParam, search } = req.query;

    const pageNum = parseInt(pageParam as string, 10) || 1;
    const limitNum = parseInt(limitParam as string, 10) || 10;
    const searchQuery = search ? (search as string).trim() : '';

    // Verify job belongs to user
    const job = await jobRepository.findOne({
      where: { id: jobId },
      relations: ['user'],
    });

    if (!job || job.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Job not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    // Build query with joins to get resume and persona names
    const queryBuilder = resultRepository
      .createQueryBuilder('result')
      .leftJoin('result.resumeVersion', 'version')
      .leftJoin('version.resume', 'resume')
      .leftJoin('resume.persona', 'persona')
      .where('result.jobId = :jobId', { jobId })
      .select([
        'result.id',
        'result.score',
        'result.createdAt',
        'result.resumeVersionId',
        'version.versionName',
        'resume.id',
        'resume.fileName',
        'persona.title',
      ]);

    // Add search filter if provided
    if (searchQuery) {
      queryBuilder.andWhere(
        '(version.versionName LIKE :search OR resume.fileName LIKE :search OR persona.title LIKE :search)',
        { search: `%${searchQuery}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const results = await queryBuilder
      .orderBy('result.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    // Map to response format
    const items: PaginatedResultListItem[] = results.map((result) => ({
      id: result.id,
      versionName: result.resumeVersion.versionName,
      resumeName: result.resumeVersion.resume.fileName,
      personaName: result.resumeVersion.resume.persona.title,
      score: result.score,
      resumeId: result.resumeVersion.resume.id,
      resumeVersionId: result.resumeVersionId,
      createdAt: result.createdAt,
    }));

    const paginatedResponse: PaginatedResultResponse = {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };

    const data: ApiResponse<PaginatedResultResponse> = {
      success: true,
      data: paginatedResponse,
    };
    res.status(200).json(data);
  }

  /**
   * Get a specific result by ID with full breakdown
   */
  async getById(req: AuthenticatedTypedRequest<null> & { params: { id: string } }, res: Response) {
    const resultRepository = getResultRepository();

    const userId = req.userId;
    const resultId = req.params.id;

    const result = await resultRepository
      .createQueryBuilder('result')
      .leftJoin('result.resumeVersion', 'version')
      .leftJoin('version.resume', 'resume')
      .leftJoin('resume.persona', 'persona')
      .leftJoin('result.job', 'job')
      .leftJoin('job.user', 'user')
      .where('result.id = :resultId', { resultId })
      .select([
        'result.id',
        'result.score',
        'result.breakdown',
        'result.createdAt',
        'result.resumeVersionId',
        'result.jobId',
        'version.versionName',
        'resume.fileName',
        'persona.title',
        'job.id',
        'user.id',
      ])
      .getOne();

    if (!result) {
      const data: ApiResponse = {
        success: false,
        message: 'Result not found',
      };
      res.status(404).json(data);
      return;
    }

    // Verify the result belongs to the user's job
    if (result.job.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Not authorized to view this result',
      };
      res.status(403).json(data);
      return;
    }

    const resultDetail: ResultDetail = {
      id: result.id,
      versionName: result.resumeVersion.versionName,
      resumeName: result.resumeVersion.resume.fileName,
      personaName: result.resumeVersion.resume.persona.title,
      score: result.score,
      breakdown: result.breakdown,
      resumeVersionId: result.resumeVersionId,
      jobId: result.jobId,
      createdAt: result.createdAt,
    };

    const data: ApiResponse<ResultDetail> = {
      success: true,
      data: resultDetail,
    };
    res.status(200).json(data);
  }
}

export default new ResultController();
