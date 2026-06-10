import type { Response, AuthenticatedTypedRequest, Request } from '../types/index.js';
import {
  getResumeRepository,
  getResumeVersionRepository,
  getPersonaRepository,
} from '../database/repositories/index.js';
import type {
  GetResumeVersionByIdInput,
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
  DeleteResumeVersionInput,
  SetActiveResumeVersionInput,
  BranchResumeInput,
  CompareVersionsInput,
} from '../middlewares/resume.js';
import { Like } from 'typeorm';
import { ApiResponse } from '@repo/shared-types';
import type {
  ResumeVersionMetadata,
  ResumeData,
  PaginatedVersionResponse,
  CompareVersionsResponse,
} from '@repo/shared-types';
import { parseFile } from '../utils/file-parser.js';
import { parseResume as parseResumeWithAI } from '../services/resume-parser.js';
import { logger } from '../utils/index.js';
import * as wsHub from '../realtime/ws-hub.js';
import {
  personaToMetadata,
  resumeToMetadata,
  versionToMetadata,
} from '../realtime/payload-mappers.js';

interface VersionParamsRequest extends Request {
  validatedParams: GetResumeVersionByIdInput;
  userId: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

class ResumeVersionController {
  /**
   * Get the active resume version for a user
   */
  async getActive(req: AuthenticatedTypedRequest<null>, res: Response) {
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const resumeId = req.query.resumeId as string | undefined;

    const queryBuilder = versionRepository
      .createQueryBuilder('version')
      .leftJoin('version.resume', 'resume')
      .leftJoin('resume.persona', 'persona')
      .leftJoin('persona.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('version.active = :active', { active: true })
      .andWhere('version.isDeleted = :isDeleted', { isDeleted: false });

    if (resumeId) {
      queryBuilder.andWhere('resume.id = :resumeId', { resumeId });
    }

    const version = await queryBuilder
      .select([
        'version.id',
        'version.fileSize',
        'version.active',
        'version.versionName',
        'version.comment',
        'version.keywords',
        'version.dataUpdatedAt',
        'version.createdAt',
        'version.updatedAt',
        'resume.id',
        'resume.fileName',
      ])
      .getOne();

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'No active resume version found',
      };
      res.status(404).json(data);
      return;
    }

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      data: {
        id: version.id,
        fileName: version.resume.fileName,
        fileSize: version.fileSize,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        keywords: version.keywords || [],
        dataUpdatedAt: version.dataUpdatedAt,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  /**
   * List all versions for a resume with pagination
   */
  async getAll(
    req: AuthenticatedTypedRequest<{ id: string }> & { query: PaginationQuery },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const resumeId = req.params.id as string;

    const { page: pageParam, limit: limitParam, search } = req.query;

    const pageNum = parseInt(pageParam as string, 10) || 1;
    const limitNum = parseInt(limitParam as string, 10) || 10;
    const searchQuery = search ? (search as string).trim() : '';

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const where: Record<string, unknown> = {
      resume: { id: resumeId },
      isDeleted: false,
    };
    if (searchQuery) {
      where.versionName = Like(`%${searchQuery}%`);
    }

    // Count total matching versions
    const total = await versionRepository.count({
      where,
    });

    // Get versions with standard pagination
    const versions = await versionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    // Map to response format
    const versionResponses: ResumeVersionMetadata[] = versions.map((v) => ({
      id: v.id,
      fileName: resume.fileName,
      fileSize: v.fileSize,
      active: v.active,
      versionName: v.versionName,
      comment: v.comment,
      keywords: v.keywords || [],
      dataUpdatedAt: v.dataUpdatedAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    const paginatedResponse: PaginatedVersionResponse = {
      items: versionResponses,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };

    const data: ApiResponse<PaginatedVersionResponse> = {
      success: true,
      data: paginatedResponse,
    };
    res.status(200).json(data);
  }

  /**
   * Get a specific version by ID
   */
  async getById(req: VersionParamsRequest, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId } = req.validatedParams;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
      select: [
        'id',
        'fileSize',
        'active',
        'versionName',
        'comment',
        'keywords',
        'dataUpdatedAt',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        keywords: version.keywords || [],
        dataUpdatedAt: version.dataUpdatedAt,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  /**
   * View the document (raw file)
   */
  async viewDocument(req: VersionParamsRequest, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId } = req.validatedParams;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
      select: ['id', 'file', 'fileSize'],
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    // Determine file extension
    const fileName = resume.fileName.toLowerCase();
    const extension = fileName.split('.').pop();

    // For TXT files, return text content for browser viewing
    if (extension === 'txt') {
      const textContent = version.file.toString('utf-8');
      const data: ApiResponse<{ text: string; fileName: string; contentType: string }> = {
        success: true,
        data: {
          text: textContent,
          fileName: resume.fileName,
          contentType: 'text/plain',
        },
      };
      res.status(200).json(data);
      return;
    }

    // Determine correct content-type based on file extension
    const getContentType = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const types: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
      };
      return types[ext || ''] || 'application/octet-stream';
    };

    // For PDF, DOCX, and other binary files, return as base64 string
    const data: ApiResponse<{
      file: string;
      fileName: string;
      fileSize: number;
      contentType: string;
    }> = {
      success: true,
      data: {
        file: version.file.toString('base64'),
        fileName: resume.fileName,
        fileSize: version.fileSize,
        contentType: getContentType(resume.fileName),
      },
    };
    res.status(200).json(data);
  }

  /**
   * View parsed data
   */
  async viewParsedData(req: VersionParamsRequest, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId } = req.validatedParams;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
      select: ['id', 'parsedData'],
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    const data: ApiResponse<ResumeData> = {
      success: true,
      data: version.parsedData as unknown as ResumeData,
    };
    res.status(200).json(data);
  }

  /**
   * Create a new version (Upload new version)
   * First version becomes active automatically
   */
  async create(
    req: AuthenticatedTypedRequest<CreateResumeVersionInput> & { file?: Express.Multer.File },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const resumeId = req.body.id;
    const { parsedData, comment, keywords } = req.body;

    if (!req.file) {
      const data: ApiResponse = {
        success: false,
        message: 'File is required',
      };
      res.status(400).json(data);
      return;
    }

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const existingVersionsCount = await versionRepository.count({
      where: { resume: { id: resumeId }, isDeleted: false },
    });

    // First version becomes active automatically
    const isFirstVersion = existingVersionsCount === 0;

    const version = versionRepository.create({
      file: req.file.buffer,
      fileSize: req.file.size,
      parsedData: parsedData || null,
      versionName: `v${existingVersionsCount + 1}`,
      comment: comment || null,
      keywords: keywords || [],
      active: isFirstVersion,
      dataUpdatedAt: parsedData ? new Date() : null,
      resume,
    });

    await versionRepository.save(version);

    wsHub.emit(userId, 'resume-version', 'create', version.id);

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      message: 'Resume version created successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        keywords: version.keywords || [],
        dataUpdatedAt: version.dataUpdatedAt,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      },
    };
    res.status(201).json(data);
  }

  /**
   * Update a version (edit parsed data or metadata)
   */
  async update(
    req: AuthenticatedTypedRequest<UpdateResumeVersionInput> & { file?: Express.Multer.File },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId, parsedData, comment, keywords } = req.body;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    // Update file if provided
    if (req.file) {
      version.file = req.file.buffer;
      version.fileSize = req.file.size;
    }

    // Update optional fields
    if (parsedData !== undefined) {
      version.parsedData = parsedData;
      version.dataUpdatedAt = new Date();
    }
    if (comment !== undefined) {
      version.comment = comment;
    }
    if (keywords !== undefined) {
      version.keywords = keywords;
    }

    await versionRepository.save(version);

    wsHub.emit(
      userId,
      'resume-version',
      'update',
      version.id,
      versionToMetadata(version, resume.fileName)
    );

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      message: 'Resume version updated successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        keywords: version.keywords || [],
        dataUpdatedAt: version.dataUpdatedAt,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  /**
   * Delete a version (only non-active)
   */
  async delete(req: AuthenticatedTypedRequest<DeleteResumeVersionInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId } = req.body;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId } },
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    // Cannot delete active version
    if (version.active) {
      const data: ApiResponse = {
        success: false,
        message: 'Cannot delete active version',
      };
      res.status(400).json(data);
      return;
    }

    if (req.destroyed || res.closed) {
      logger.info(
        { resumeId, versionId: version.id },
        'Delete resume version aborted by client; skipping DB write'
      );
      return;
    }

    const remainingVersionsCount = await versionRepository.count({
      where: { resume: { id: resumeId }, isDeleted: false },
    });

    version.isDeleted = true;
    await versionRepository.save(version);

    wsHub.emit(userId, 'resume-version', 'delete', version.id, undefined, [
      { id: resumeId, versionsCount: Math.max(0, remainingVersionsCount - 1) },
    ]);

    const data: ApiResponse = {
      success: true,
      message: 'Resume version deleted successfully',
    };
    res.status(200).json(data);
  }

  /**
   * Set a version as active
   * This also updates the parent resume and grandparent persona to active
   * Returns the previous active persona, resume, and version IDs for cache invalidation
   */
  async setActive(req: AuthenticatedTypedRequest<SetActiveResumeVersionInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { id: resumeId, versionId } = req.body;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    // Already active
    if (version.active) {
      const data: ApiResponse = {
        success: false,
        message: 'Version is already active',
      };
      res.status(400).json(data);
      return;
    }

    // Get the currently active persona for the user
    const previousActivePersona = await personaRepository.findOne({
      where: { user: { id: userId }, active: true },
    });
    const previousPersonaId = previousActivePersona?.id || null;

    // Get the currently active resume for the user
    const previousActiveResume = await resumeRepository.findOne({
      where: { persona: { user: { id: userId } }, active: true },
    });
    const previousResumeId = previousActiveResume?.id || null;

    let previousActiveVersion = null;
    if (previousResumeId) {
      previousActiveVersion = await versionRepository.findOne({
        where: { resume: { id: previousResumeId }, active: true, isDeleted: false },
      });
    }

    // Set the previous active version to inactive (if exists)
    if (previousActiveVersion) {
      previousActiveVersion.active = false;
      await versionRepository.save(previousActiveVersion);
    }

    // Set the previous active resume to inactive (if exists and different from current)
    if (previousActiveResume && previousActiveResume.id !== resumeId) {
      previousActiveResume.active = false;
      await resumeRepository.save(previousActiveResume);
    }

    // Set the current resume to active
    resume.active = true;
    await resumeRepository.save(resume);

    // Set the previous active persona to inactive (if exists and different from current)
    if (previousActivePersona && previousActivePersona.id !== resume.persona.id) {
      previousActivePersona.active = false;
      await personaRepository.save(previousActivePersona);
    }

    // Set the current persona to active
    resume.persona.active = true;
    await personaRepository.save(resume.persona);

    // Set the selected version to active
    version.active = true;
    await versionRepository.save(version);

    wsHub.emit(
      userId,
      'resume-version',
      'setActive',
      version.id,
      versionToMetadata(version, resume.fileName),
      previousActiveVersion && previousActiveVersion.id !== version.id
        ? [
            versionToMetadata(
              previousActiveVersion,
              previousActiveResume?.fileName ?? resume.fileName
            ),
          ]
        : undefined
    );
    wsHub.emit(
      userId,
      'resume',
      'setActive',
      resume.id,
      resumeToMetadata(resume),
      previousActiveResume && previousActiveResume.id !== resume.id
        ? [resumeToMetadata(previousActiveResume)]
        : undefined
    );
    wsHub.emit(
      userId,
      'persona',
      'setActive',
      resume.persona.id,
      personaToMetadata(resume.persona),
      previousActivePersona && previousActivePersona.id !== resume.persona.id
        ? [personaToMetadata(previousActivePersona)]
        : undefined
    );

    const data: ApiResponse<
      ResumeVersionMetadata & {
        previousPersonaId: string | null;
        newPersonaId: string;
        previousResumeId: string | null;
        newResumeId: string;
      }
    > = {
      success: true,
      message: 'Resume version set as active successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        keywords: version.keywords || [],
        dataUpdatedAt: version.dataUpdatedAt,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        previousPersonaId,
        newPersonaId: resume.persona.id,
        previousResumeId,
        newResumeId: resumeId,
      },
    };
    res.status(200).json(data);
  }

  /**
   * Branch: Create a new resume from this version
   */
  async branch(req: AuthenticatedTypedRequest<BranchResumeInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionId, newFileName, commit } = req.body;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const version = await versionRepository.findOne({
      where: { id: versionId, resume: { id: resumeId }, isDeleted: false },
      select: ['id', 'file', 'fileSize', 'parsedData', 'dataUpdatedAt', 'versionName', 'keywords'],
    });

    if (!version) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume version not found',
      };
      res.status(404).json(data);
      return;
    }

    // Create a new resume under the same persona
    const newResume = resumeRepository.create({
      fileName: newFileName,
      active: false,
      persona: resume.persona,
    });

    await resumeRepository.save(newResume);

    // Use commit message as comment if provided, otherwise use auto-generated comment
    const comment = commit || `Branched from ${resume.fileName} ${version.versionName}`;

    // Create the first version for the new resume with the branched content
    const newVersion = versionRepository.create({
      file: version.file,
      fileSize: version.fileSize,
      parsedData: version.parsedData ? { ...version.parsedData } : null,
      versionName: 'v1',
      comment: comment,
      keywords: [...version.keywords],
      active: true,
      dataUpdatedAt: version.dataUpdatedAt,
      resume: newResume,
    });

    await versionRepository.save(newVersion);

    wsHub.emit(userId, 'resume', 'create', newResume.id);
    wsHub.emit(userId, 'resume-version', 'create', newVersion.id);

    const data: ApiResponse<{
      resume: {
        id: string;
        fileName: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
      version: ResumeVersionMetadata;
    }> = {
      success: true,
      message: 'Resume branched successfully',
      data: {
        resume: {
          id: newResume.id,
          fileName: newResume.fileName,
          active: newResume.active,
          createdAt: newResume.createdAt,
          updatedAt: newResume.updatedAt,
        },
        version: {
          id: newVersion.id,
          fileName: newResume.fileName,
          fileSize: newVersion.fileSize,
          active: newVersion.active,
          versionName: newVersion.versionName,
          comment: newVersion.comment,
          keywords: newVersion.keywords || [],
          dataUpdatedAt: newVersion.dataUpdatedAt,
          createdAt: newVersion.createdAt,
          updatedAt: newVersion.updatedAt,
        },
      },
    };
    res.status(201).json(data);
  }

  /**
   * Compare two versions
   */
  async compare(req: AuthenticatedTypedRequest<CompareVersionsInput>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const { id: resumeId, versionA, versionB } = req.body;

    // Verify resume belongs to user
    const resume = await resumeRepository.findOne({
      where: { id: resumeId },
      relations: ['persona', 'persona.user'],
    });

    if (!resume || resume.persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'Resume not found or not authorized',
      };
      res.status(403).json(data);
      return;
    }

    const [version1, version2] = await Promise.all([
      versionRepository
        .createQueryBuilder('rv')
        .select(['rv.fileSize', 'rv.comment', 'rv.updatedAt', 'rv.parsedData'])
        .where('rv.id = :versionId', { versionId: versionA })
        .andWhere('rv.resumeId = :resumeId', { resumeId })
        .andWhere('rv.isDeleted = :isDeleted', { isDeleted: false })
        .getRawOne(),
      versionRepository
        .createQueryBuilder('rv')
        .select(['rv.fileSize', 'rv.comment', 'rv.updatedAt', 'rv.parsedData'])
        .where('rv.id = :versionId', { versionId: versionB })
        .andWhere('rv.resumeId = :resumeId', { resumeId })
        .andWhere('rv.isDeleted = :isDeleted', { isDeleted: false })
        .getRawOne(),
    ]);

    if (!version1 || !version2) {
      const data: ApiResponse = {
        success: false,
        message: 'One or both versions not found',
      };
      res.status(404).json(data);
      return;
    }

    const versionAData = {
      fileName: resume.fileName,
      fileSize: version1.rv_fileSize,
      comment: version1.rv_comment,
      updatedAt: new Date(version1.rv_updatedAt),
      parsedData: version1.rv_parsedData as unknown as ResumeData,
    };

    const versionBData = {
      fileName: resume.fileName,
      fileSize: version2.rv_fileSize,
      comment: version2.rv_comment,
      updatedAt: new Date(version2.rv_updatedAt),
      parsedData: version2.rv_parsedData as unknown as ResumeData,
    };

    const compareData: CompareVersionsResponse = {
      versionA: versionAData,
      versionB: versionBData,
    };

    const data: ApiResponse<CompareVersionsResponse> = {
      success: true,
      data: compareData,
    };
    res.status(200).json(data);
  }

  /**
   * Parse a file (for parsing before creating version)
   */
  async parseFile(
    req: AuthenticatedTypedRequest<null> & { file?: Express.Multer.File },
    res: Response
  ) {
    const userId = req.userId;

    if (!req.file) {
      const data: ApiResponse = {
        success: false,
        message: 'File is required',
      };
      res.status(400).json(data);
      return;
    }

    // Extract text from file
    let extractedText = '';
    try {
      extractedText = await parseFile(req.file.buffer, req.file.originalname);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      const data: ApiResponse = {
        success: false,
        message: errorMessage,
      };
      res.status(400).json(data);
      return;
    }

    // Parse resume using AI (uses user's active API key)
    const parseResult = await parseResumeWithAI(extractedText, userId);

    if (!parseResult.success) {
      const data: ApiResponse = {
        success: false,
        message: parseResult.message,
      };
      res.status(500).json(data);
      return;
    }

    const data: ApiResponse<ResumeData> = {
      success: true,
      message: 'File parsed successfully',
      data: parseResult.data as ResumeData,
    };
    res.status(200).json(data);
  }
}

export default new ResumeVersionController();
