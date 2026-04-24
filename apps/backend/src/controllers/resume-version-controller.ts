import type { Response, AuthenticatedTypedRequest, Request } from '../types/index.js';
import { getResumeRepository, getResumeVersionRepository } from '../database/repositories/index.js';
import type {
  GetResumeVersionByIdInput,
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
  DeleteResumeVersionInput,
  SetActiveResumeVersionInput,
  BranchResumeInput,
  CompareVersionsInput,
} from '../middlewares/resume.js';
import { ApiResponse } from '@repo/shared-types';
import type { ResumeVersionMetadata, ResumeData } from '@repo/shared-types';
import { parseFile } from '../utils/file-parser.js';
import { parseResume as parseResumeWithAI } from '../services/resume-parser.js';

interface VersionParamsRequest extends Request {
  validatedParams: GetResumeVersionByIdInput;
  userId: string;
}

class ResumeVersionController {
  /**
   * List all versions for a resume (latest first)
   */
  async getAll(req: AuthenticatedTypedRequest<{ id: string }>, res: Response) {
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const userId = req.userId;
    const resumeId = req.params.id as string;

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

    const versions = await versionRepository.find({
      where: { resume: { id: resumeId } },
      select: [
        'id',
        'fileSize',
        'keywords',
        'active',
        'versionName',
        'comment',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });

    const versionResponses: ResumeVersionMetadata[] = versions.map((v) => ({
      id: v.id,
      fileName: resume.fileName,
      fileSize: v.fileSize,
      keywords: v.keywords,
      active: v.active,
      versionName: v.versionName,
      comment: v.comment,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    const data: ApiResponse<ResumeVersionMetadata[]> = {
      success: true,
      data: versionResponses,
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
      where: { id: versionId, resume: { id: resumeId } },
      select: [
        'id',
        'fileSize',
        'keywords',
        'active',
        'versionName',
        'comment',
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
        keywords: version.keywords,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
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
      where: { id: versionId, resume: { id: resumeId } },
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

    // For PDF, DOCX, and other binary files, return raw file data
    const data: ApiResponse<{
      file: Buffer;
      fileName: string;
      fileSize: number;
      contentType: string;
    }> = {
      success: true,
      data: {
        file: version.file,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        contentType: 'application/octet-stream',
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
      where: { id: versionId, resume: { id: resumeId } },
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
    const { keywords, parsedData, comment } = req.body;

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

    // Count existing versions to generate version name
    const existingVersionsCount = await versionRepository.count({
      where: { resume: { id: resumeId } },
    });

    // First version becomes active automatically
    const isFirstVersion = existingVersionsCount === 0;

    const version = versionRepository.create({
      file: req.file.buffer,
      fileSize: req.file.size,
      keywords: keywords || [],
      parsedData: parsedData || null,
      versionName: `v${existingVersionsCount + 1}`,
      comment: comment || null,
      active: isFirstVersion,
      resume,
    });

    await versionRepository.save(version);

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      message: 'Resume version created successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        keywords: version.keywords,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
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
    const { id: resumeId, versionId, keywords, parsedData, comment } = req.body;

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

    // Update file if provided
    if (req.file) {
      version.file = req.file.buffer;
      version.fileSize = req.file.size;
    }

    // Update optional fields
    if (keywords !== undefined) {
      version.keywords = keywords;
    }
    if (parsedData !== undefined) {
      version.parsedData = parsedData;
    }
    if (comment !== undefined) {
      version.comment = comment;
    }

    await versionRepository.save(version);

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      message: 'Resume version updated successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        keywords: version.keywords,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
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

    await versionRepository.remove(version);

    const data: ApiResponse = {
      success: true,
      message: 'Resume version deleted successfully',
    };
    res.status(200).json(data);
  }

  /**
   * Set a version as active
   */
  async setActive(req: AuthenticatedTypedRequest<SetActiveResumeVersionInput>, res: Response) {
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

    // Already active
    if (version.active) {
      const data: ApiResponse = {
        success: false,
        message: 'Version is already active',
      };
      res.status(400).json(data);
      return;
    }

    // Set all versions of this resume to inactive
    await versionRepository.update({ resume: { id: resumeId } }, { active: false });

    // Set the selected version to active
    version.active = true;
    await versionRepository.save(version);

    const data: ApiResponse<ResumeVersionMetadata> = {
      success: true,
      message: 'Resume version set as active successfully',
      data: {
        id: version.id,
        fileName: resume.fileName,
        fileSize: version.fileSize,
        keywords: version.keywords,
        active: version.active,
        versionName: version.versionName,
        comment: version.comment,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
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
    const { id: resumeId, versionId, newFileName } = req.body;

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
      select: ['id', 'file', 'fileSize', 'keywords', 'parsedData', 'versionName'],
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
      active: true,
      persona: resume.persona,
    });

    await resumeRepository.save(newResume);

    // Create the first version for the new resume with the branched content
    const newVersion = versionRepository.create({
      file: version.file,
      fileSize: version.fileSize,
      keywords: [...version.keywords],
      parsedData: version.parsedData ? { ...version.parsedData } : null,
      versionName: 'v1',
      comment: `Branched from ${resume.fileName} ${version.versionName}`,
      active: true,
      resume: newResume,
    });

    await versionRepository.save(newVersion);

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
          keywords: newVersion.keywords,
          active: newVersion.active,
          versionName: newVersion.versionName,
          comment: newVersion.comment,
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
      versionRepository.findOne({
        where: { id: versionA, resume: { id: resumeId } },
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
      }),
      versionRepository.findOne({
        where: { id: versionB, resume: { id: resumeId } },
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
      }),
    ]);

    if (!version1 || !version2) {
      const data: ApiResponse = {
        success: false,
        message: 'One or both versions not found',
      };
      res.status(404).json(data);
      return;
    }

    const data: ApiResponse<{
      versionA: ResumeVersionMetadata;
      versionB: ResumeVersionMetadata;
      diff: {
        keywordsAdded: string[];
        keywordsRemoved: string[];
        parsedDataChanged: boolean;
        commentChanged: boolean;
      };
    }> = {
      success: true,
      data: {
        versionA: {
          id: version1.id,
          fileName: resume.fileName,
          fileSize: version1.fileSize,
          keywords: version1.keywords,
          active: version1.active,
          versionName: version1.versionName,
          comment: version1.comment,
          createdAt: version1.createdAt,
          updatedAt: version1.updatedAt,
        },
        versionB: {
          id: version2.id,
          fileName: resume.fileName,
          fileSize: version2.fileSize,
          keywords: version2.keywords,
          active: version2.active,
          versionName: version2.versionName,
          comment: version2.comment,
          createdAt: version2.createdAt,
          updatedAt: version2.updatedAt,
        },
        diff: {
          keywordsAdded: version2.keywords.filter((k) => !version1.keywords.includes(k)),
          keywordsRemoved: version1.keywords.filter((k) => !version2.keywords.includes(k)),
          parsedDataChanged:
            JSON.stringify(version1.parsedData) !== JSON.stringify(version2.parsedData),
          commentChanged: version1.comment !== version2.comment,
        },
      },
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
