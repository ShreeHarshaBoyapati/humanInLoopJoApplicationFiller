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
import { ApiResponse } from '@repo/shared-types';
import type { ResumeMetadata, ResumeWithVersions, ResumeVersionMetadata } from '@repo/shared-types';

interface ValidatedParamsRequest extends Request {
  validatedParams: GetResumeByIdInput;
  userId: string;
}

class ResumeController {
  async create(req: AuthenticatedTypedRequest<CreateResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { personaId, fileName } = req.body;

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

    const resume = resumeRepository.create({
      fileName,
      active: false,
      persona,
    });

    await resumeRepository.save(resume);

    const data: ApiResponse<ResumeMetadata> = {
      success: true,
      message: 'Resume created successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        active: resume.active,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      } as ResumeMetadata,
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

  async getAll(req: AuthenticatedTypedRequest<null>, res: Response) {
    const resumeRepository = getResumeRepository();

    const userId = req.userId;
    const personaId = req.query.personaId as string | undefined;

    const queryBuilder = resumeRepository
      .createQueryBuilder('resume')
      .leftJoin('resume.persona', 'persona')
      .leftJoin('persona.user', 'user')
      .where('user.id = :userId', { userId })
      .select([
        'resume.id',
        'resume.fileName',
        'resume.active',
        'resume.createdAt',
        'resume.updatedAt',
      ]);

    if (personaId) {
      queryBuilder.andWhere('persona.id = :personaId', { personaId });
    }

    const resumes = await queryBuilder.getMany();

    const resumeResponses: ResumeMetadata[] = resumes.map(
      (r) =>
        ({
          id: r.id,
          fileName: r.fileName,
          active: r.active,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }) as ResumeMetadata
    );

    const data: ApiResponse<ResumeMetadata[]> = {
      success: true,
      data: resumeResponses,
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
