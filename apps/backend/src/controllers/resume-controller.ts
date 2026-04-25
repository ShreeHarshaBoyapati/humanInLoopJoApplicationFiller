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
  SetActiveResumeInput,
} from '../middlewares/resume.js';
import { Like } from 'typeorm';
import { ApiResponse } from '@repo/shared-types';
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
    const { personaId, fileName, file, keywords, parsedData } = req.body;

    // Verify persona belongs to user
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

    // Check if there are any existing resumes for this persona
    const existingResumesCount = await resumeRepository.count({
      where: { persona: { id: personaId } },
    });

    // If no resumes exist for this persona, this resume will be active
    const isActive = existingResumesCount === 0;

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
      active: true,
      versionName: 'v1',
      parsedData: parsedData || null,
      resume,
    });

    await versionRepository.save(version);

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

    // Update fileName if provided
    if (fileName) {
      resume.fileName = fileName;
    }

    await resumeRepository.save(resume);

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

    await resumeRepository.remove(resume);

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

    // Build base where clause
    const buildBaseWhereClause = () => {
      const where: Record<string, unknown> = {
        persona: { user: { id: userId } },
      };
      if (personaId) {
        where.persona = { id: personaId, user: { id: userId } };
      }
      if (searchQuery) {
        where.fileName = Like(`%${searchQuery}%`);
      }
      return where;
    };

    // Get active resume
    let activeResume = await resumeRepository.findOne({
      where: { persona: { id: personaId, user: { id: userId } }, active: true },
      relations: ['persona'],
    });

    if (activeResume && personaId) {
      if (activeResume.persona.id !== personaId) {
        activeResume = null;
      }
    }

    // Check if active resume matches search query
    const activeMatchesSearch =
      activeResume && searchQuery
        ? activeResume.fileName.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

    // Count total matching resumes
    const total = await resumeRepository.count({
      where: buildBaseWhereClause(),
    });

    // Helper function to build resume list item for a single resume
    const buildResumeListItem = async (resume: {
      id: string;
      fileName: string;
      active: boolean;
      updatedAt: Date;
    }): Promise<PaginatedResumeListItem> => {
      const versionsCount = await versionRepository
        .createQueryBuilder('version')
        .where('version.resumeId = :resumeId', { resumeId: resume.id })
        .getCount();

      const activeVersion = await versionRepository
        .createQueryBuilder('version')
        .select(['version.fileSize'])
        .where('version.resumeId = :resumeId', { resumeId: resume.id })
        .andWhere('version.active = :active', { active: true })
        .getOne();

      return {
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        versionsCount,
        activeVersionFileSize: activeVersion?.fileSize ?? null,
        updatedAt: resume.updatedAt,
      };
    };

    let resumes: {
      id: string;
      fileName: string;
      active: boolean;
      updatedAt: Date;
    }[] = [];

    if (pageNum === 1) {
      // Page 1: active resume first if it matches search, then latest matching
      if (activeResume && activeMatchesSearch) {
        resumes.push(activeResume);
      }

      // Calculate how many non-active resumes to fetch
      const nonActiveLimit = activeResume && activeMatchesSearch ? limitNum - 1 : limitNum;

      // Get matching non-active resumes
      const whereClause = { ...buildBaseWhereClause(), active: false };
      const nonActiveResumes = await resumeRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: nonActiveLimit,
      });

      resumes = resumes.concat(nonActiveResumes);
    } else {
      // For pages after 1, adjust skip if active resume is shown on page 1
      const baseSkip = (pageNum - 1) * limitNum;
      const skip = activeResume && activeMatchesSearch ? baseSkip - 1 : baseSkip;

      const whereClause = { ...buildBaseWhereClause(), active: false };
      const nonActiveResumes = await resumeRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip: Math.max(0, skip),
        take: limitNum,
      });

      resumes = nonActiveResumes;
    }

    // Build items using Promise.all for parallel queries
    const items = await Promise.all(resumes.map(buildResumeListItem));

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
      where: { id },
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

  async setActive(req: AuthenticatedTypedRequest<SetActiveResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();

    const userId = req.userId;
    const { id } = req.body;

    // Get the resume to set as active
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

    // Get all resumes for the same persona that are active
    const activeResumes = await resumeRepository.find({
      where: { persona: { id: resume.persona.id }, active: true },
    });

    // Deactivate all active resumes for this persona
    for (const activeResume of activeResumes) {
      activeResume.active = false;
      await resumeRepository.save(activeResume);
    }

    // Set the selected resume as active
    resume.active = true;
    await resumeRepository.save(resume);

    const data: ApiResponse<ResumeMetadata> = {
      success: true,
      message: 'Resume set as active successfully',
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
      .andWhere('resume.active = :active', { active: true });

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

    // Fetch the active version
    const activeVersion = await versionRepository.findOne({
      where: { resume: { id: resume.id }, active: true },
      select: [
        'id',
        'fileSize',
        'keywords',
        'active',
        'versionName',
        'comment',
        'parsedData',
        'createdAt',
        'updatedAt',
      ],
    });

    const activeVersionResponse: ResumeVersionMetadata | undefined = activeVersion
      ? {
          id: activeVersion.id,
          fileName: resume.fileName,
          fileSize: activeVersion.fileSize,
          keywords: activeVersion.keywords,
          active: activeVersion.active,
          versionName: activeVersion.versionName,
          comment: activeVersion.comment,
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
