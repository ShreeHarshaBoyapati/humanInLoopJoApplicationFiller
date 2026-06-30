import type { Response, AuthenticatedTypedRequest, Request } from '../types/index.js';
import {
  getResumeRepository,
  getPersonaRepository,
  getResumeVersionRepository,
} from '../database/repositories/index.js';
import type {
  DeleteResumeInput,
  UpdateResumeInput,
  GetResumeByIdInput,
  CreateResumeInput,
} from '../middlewares/resume.js';
import { ILike } from 'typeorm';
import { ApiResponse } from '@repo/shared-types';
import { logger } from '../utils/index.js';
import * as wsHub from '../realtime/ws-hub.js';
import { resumeToMetadata, versionToMetadata } from '../realtime/payload-mappers.js';
import type {
  ResumeMetadata,
  ResumeWithVersions,
  ResumeVersionMetadata,
  PaginatedResumeResponse,
  PaginatedResumeListItem,
} from '@repo/shared-types';

interface ValidatedParamsRequest extends Request {
  validatedParams: GetResumeByIdInput;
  userId: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  personaId?: string;
  search?: string;
}

class ResumeController {
  async create(req: AuthenticatedTypedRequest<CreateResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const personaRepository = getPersonaRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { personaId, fileName, file, keywords, parsedData, comment } = req.body;

    const persona = await personaRepository.findOne({
      where: { id: personaId },
      relations: ['user'],
    });

    if (!persona || persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Persona not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const duplicateResume = await resumeRepository.findOne({
      where: { fileName, persona: { id: personaId }, isDeleted: false },
    });

    if (duplicateResume) {
      const data: ApiResponse = {
        success: false,
        message: 'A resume with this file name already exists for this persona',
      };
      res.status(400).json(data);
      return;
    }

    const activeResumesCount = await resumeRepository.count({
      where: {
        persona: { user: { id: userId } },
        active: true,
        isDeleted: false,
      },
    });

    const isActive = activeResumesCount === 0;

    const resume = resumeRepository.create({
      fileName,
      active: isActive,
      persona,
    });

    await resumeRepository.save(resume);

    // Create the resume version with the file data
    const version = versionRepository.create({
      file: Buffer.from(file.base64, 'base64'),
      fileSize: file.size,
      keywords: keywords || [],
      active: isActive,
      versionName: 'v1',
      parsedData: parsedData || null,
      comment: comment || null,
      resume,
    });

    await versionRepository.save(version);

    const personaResumesCount = await resumeRepository.count({
      where: { persona: { id: personaId }, isDeleted: false },
    });

    wsHub.emit(
      userId,
      'resume',
      'create',
      resume.id,
      undefined,
      [{ personaId }, { id: personaId, resumesCount: personaResumesCount }],
      req.realtimeClientId
    );
    wsHub.emit(
      userId,
      'resume-version',
      'create',
      version.id,
      versionToMetadata(version, resume.fileName, resume.id, personaId),
      undefined,
      req.realtimeClientId
    );

    const data: ApiResponse<ResumeMetadata & { fileSize: number }> = {
      success: true,
      message: 'Resume created successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
        fileSize: file.size,
      },
    };
    res.status(201).json(data);
  }

  async update(req: AuthenticatedTypedRequest<UpdateResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();

    const userId = req.userId;
    const { id, fileName } = req.body;

    const resume = await resumeRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['persona', 'persona.user'],
    });

    if (!resume) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found',
      };
      res.status(404).json(data);
      return;
    }

    if (resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    if (fileName) {
      const duplicateResume = await resumeRepository.findOne({
        where: { fileName, persona: { id: resume.persona.id }, isDeleted: false },
      });

      if (duplicateResume && duplicateResume.id !== id) {
        const data: ApiResponse = {
          success: false,
          message: 'A resume with this file name already exists for this persona',
        };
        res.status(400).json(data);
        return;
      }

      resume.fileName = fileName;
    }

    await resumeRepository.save(resume);

    wsHub.emit(
      userId,
      'resume',
      'update',
      resume.id,
      resumeToMetadata(resume),
      undefined,
      req.realtimeClientId
    );

    const data: ApiResponse<ResumeMetadata> = {
      success: true,
      message: 'Resume updated successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      } as ResumeMetadata,
    };
    res.status(200).json(data);
  }

  async delete(req: AuthenticatedTypedRequest<DeleteResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id } = req.body;

    const resume = await resumeRepository.findOne({
      where: { id },
      relations: ['persona', 'persona.user'],
    });

    if (!resume) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found',
      };
      res.status(404).json(data);
      return;
    }

    if (resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    if (req.clientAborted) {
      logger.info({ id: resume.id }, 'Delete resume aborted by client; skipping DB write');
      return;
    }

    const remainingResumesCount = await resumeRepository.count({
      where: { persona: { id: resume.persona.id }, isDeleted: false },
    });

    resume.isDeleted = true;
    await resumeRepository.save(resume);

    // Soft delete all resume versions for this resume
    const versions = await versionRepository.find({
      where: { resume: { id: resume.id } },
    });

    await Promise.all(
      versions.map((version) => {
        version.isDeleted = true;
        return versionRepository.save(version);
      })
    );

    wsHub.emit(
      userId,
      'resume',
      'delete',
      resume.id,
      undefined,
      [
        { id: resume.persona.id, resumesCount: Math.max(0, remainingResumesCount - 1) },
        { personaId: resume.persona.id, resumeId: resume.id },
      ],
      req.realtimeClientId
    );

    const data: ApiResponse = {
      success: true,
      message: 'Resume deleted successfully',
    };

    res.status(200).json(data);
  }

  async getPaginated(
    req: AuthenticatedTypedRequest<null> & { query: PaginationQuery },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { page: pageParam, limit: limitParam, personaId, search } = req.query;

    const pageNum = parseInt(pageParam as string, 10) || 1;
    const limitNum = parseInt(limitParam as string, 10) || 10;
    const searchQuery = search ? (search as string).trim() : '';

    // Batch helpers to avoid O(N) sequential queries when building the list.
    const getVersionsCountByResumeIds = async (
      resumeIds: string[]
    ): Promise<Map<string, number>> => {
      const counts = new Map<string, number>();
      if (resumeIds.length === 0) return counts;

      for (const id of resumeIds) {
        counts.set(id, 0);
      }

      const batches: string[][] = [];
      for (let i = 0; i < resumeIds.length; i += 25) {
        batches.push(resumeIds.slice(i, i + 25));
      }

      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          const rows = (await versionRepository
            .createQueryBuilder('version')
            .select('version.resumeId', 'resumeId')
            .addSelect('COUNT(version.id)', 'count')
            .where('version.resumeId IN (:...batch)', { batch })
            .andWhere('version.isDeleted = :isDeleted', { isDeleted: false })
            .groupBy('version.resumeId')
            .getRawMany()) as Array<{ resumeId: string; count: string }>;
          return rows;
        })
      );

      for (const rows of batchResults) {
        for (const row of rows) {
          counts.set(row.resumeId, parseInt(row.count, 10));
        }
      }

      return counts;
    };

    const buildResumeListItems = async (
      resumes: Array<{ id: string; fileName: string; active: boolean; updatedAt: Date }>
    ): Promise<PaginatedResumeListItem[]> => {
      const ids = resumes.map((r) => r.id);
      const [versionsCounts] = await Promise.all([getVersionsCountByResumeIds(ids)]);

      return resumes.map((resume) => ({
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        versionsCount: versionsCounts.get(resume.id) ?? 0,
        updatedAt: resume.updatedAt,
      }));
    };

    const buildBaseWhereClause = (includeSearch: boolean = true) => {
      const where: Record<string, unknown> = {
        persona: { user: { id: userId } },
        isDeleted: false,
      };
      if (personaId) {
        where.persona = { id: personaId, user: { id: userId } };
      }
      if (includeSearch && searchQuery) {
        where.fileName = ILike(`%${searchQuery}%`);
      }
      return where;
    };

    // When searching, return all matching resumes in normal order
    if (searchQuery) {
      const whereClause = buildBaseWhereClause(true);
      const total = await resumeRepository.count({ where: whereClause });

      const resumes = await resumeRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });

      const items = await buildResumeListItems(resumes);

      const paginatedResponse: PaginatedResumeResponse = {
        items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      };

      const data: ApiResponse<PaginatedResumeResponse> = {
        success: true,
        data: paginatedResponse,
      };
      res.status(200).json(data);
      return;
    }

    // No search - existing behavior with active resume first
    const totalWhere = buildBaseWhereClause(false);
    const total = await resumeRepository.count({
      where: totalWhere,
    });

    const items: PaginatedResumeListItem[] = [];

    if (pageNum === 1) {
      // Page 1: get active resume first, then non-active (exclude soft-deleted)
      const activeResumeWhere: Record<string, unknown> = {
        persona: { user: { id: userId } },
        active: true,
        isDeleted: false,
      };
      if (personaId) {
        activeResumeWhere.persona = { id: personaId, user: { id: userId } };
      }

      const activeResume = await resumeRepository.findOne({
        where: activeResumeWhere,
      });

      // Get non-active resumes
      const whereClause = { ...buildBaseWhereClause(false), active: false };
      const nonActiveResumes = await resumeRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: activeResume ? limitNum - 1 : limitNum,
      });

      const pageResumes = activeResume ? [activeResume, ...nonActiveResumes] : nonActiveResumes;
      items.push(...(await buildResumeListItems(pageResumes)));
    } else {
      // For pages after 1, check if there's an active resume to adjust skip (exclude soft-deleted)
      const activeResumeWhere: Record<string, unknown> = {
        persona: { user: { id: userId } },
        active: true,
        isDeleted: false,
      };
      if (personaId) {
        activeResumeWhere.persona = { id: personaId, user: { id: userId } };
      }

      const hasActiveResume = await resumeRepository.count({
        where: activeResumeWhere,
      });

      const skip = hasActiveResume > 0 ? (pageNum - 1) * limitNum - 1 : (pageNum - 1) * limitNum;

      const whereClause = { ...buildBaseWhereClause(false), active: false };
      const nonActiveResumes = await resumeRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip: Math.max(0, skip),
        take: limitNum,
      });

      items.push(...(await buildResumeListItems(nonActiveResumes)));
    }

    const paginatedResponse: PaginatedResumeResponse = {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };

    const data: ApiResponse<PaginatedResumeResponse> = {
      success: true,
      data: paginatedResponse,
    };
    res.status(200).json(data);
  }

  async getById(req: ValidatedParamsRequest, res: Response) {
    const resumeRepository = getResumeRepository();

    const userId = req.userId;
    const { id } = req.validatedParams;

    const resume = await resumeRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['persona', 'persona.user'],
      select: ['id', 'fileName', 'active', 'createdAt', 'updatedAt'],
    });

    if (!resume) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found',
      };
      res.status(404).json(data);
      return;
    }

    if (resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const data: ApiResponse<ResumeMetadata> = {
      success: true,
      data: {
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      } as ResumeMetadata,
    };
    res.status(200).json(data);
  }

  async getActive(req: AuthenticatedTypedRequest<null>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const personaId = req.query.personaId as string | undefined;

    const queryBuilder = resumeRepository
      .createQueryBuilder('resume')
      .leftJoin('resume.persona', 'persona')
      .leftJoin('persona.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('resume.active = :active', { active: true })
      .andWhere('resume.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('persona.isDeleted = :personaIsDeleted', { personaIsDeleted: false });

    if (personaId) {
      queryBuilder.andWhere('persona.id = :personaId', { personaId });
    }

    // Find the active resume for the user
    const resume = await queryBuilder
      .select([
        'resume.id',
        'resume.fileName',
        'resume.active',
        'resume.createdAt',
        'resume.updatedAt',
      ])
      .getOne();

    if (!resume) {
      const data: ApiResponse = {
        success: false,
        message: 'No active resume found',
      };
      res.status(404).json(data);
      return;
    }

    const activeVersion = await versionRepository.findOne({
      where: { resume: { id: resume.id }, active: true, isDeleted: false },
      select: [
        'id',
        'fileSize',
        'active',
        'versionName',
        'comment',
        'keywords',
        'parsedData',
        'dataUpdatedAt',
        'createdAt',
        'updatedAt',
      ],
    });

    const activeVersionResponse: ResumeVersionMetadata | undefined = activeVersion
      ? {
          id: activeVersion.id,
          fileName: resume.fileName,
          fileSize: activeVersion.fileSize,
          active: activeVersion.active,
          versionName: activeVersion.versionName,
          comment: activeVersion.comment,
          keywords: activeVersion.keywords || [],
          dataUpdatedAt: activeVersion.dataUpdatedAt,
          createdAt: activeVersion.createdAt,
          updatedAt: activeVersion.updatedAt,
        }
      : undefined;

    const resumeResponse: ResumeWithVersions = {
      id: resume.id,
      fileName: resume.fileName,
      active: resume.active,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      versions: activeVersionResponse ? [activeVersionResponse] : [],
      activeVersion: activeVersionResponse,
    };

    const data: ApiResponse<ResumeWithVersions> = {
      success: true,
      data: resumeResponse,
    };
    res.status(200).json(data);
  }
}

export default new ResumeController();
