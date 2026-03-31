import type { Response, AuthenticatedTypedRequest, Request } from '../types/index.js';
import { getResumeRepository, getPersonaRepository } from '../database/repositories/index.js';
import type {
  DeleteResumeInput,
  UpdateResumeInput,
  GetResumeByIdInput,
  CreateResumeInput,
} from '../middlewares/resume.js';
import { ApiResponse } from '@repo/shared-types';
import type { ResumeData } from '@repo/shared-types';
import { parseFile } from '../utils/file-parser.js';
import { parseResume as parseResumeWithAI } from '../services/resume-parser.js';

interface ResumeMetadataResponse {
  id: string;
  fileName: string;
  fileSize: number;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ResumeFullResponse {
  id: string;
  fileName: string;
  fileSize: number;
  file: Buffer;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ValidatedParamsRequest extends Request {
  validatedParams: GetResumeByIdInput;
  userId: string;
}

class ResumeController {
  async create(
    req: AuthenticatedTypedRequest<CreateResumeInput> & { file?: Express.Multer.File },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { personaId } = req.body;

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
      res.status(404).json(data);
      return;
    }

    if (!req.file) {
      const data: ApiResponse = {
        success: false,
        message: 'File is required',
      };
      res.status(400).json(data);
      return;
    }

    // Get keywords from body (already parsed by middleware)
    const keywords = req.body.keywords || [];
    const parsedData = req.body.parsedData || null;

    // Check if this is the first resume for this persona
    const existingResumesCount = await resumeRepository.count({
      where: { persona: { id: personaId } },
    });

    const resume = resumeRepository.create({
      file: req.file.buffer,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      keywords,
      parsedData,
      persona,
      active: existingResumesCount === 0,
    });

    await resumeRepository.save(resume);

    const data: ApiResponse<ResumeMetadataResponse> = {
      success: true,
      message: 'Resume created successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        keywords: resume.keywords,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    };
    res.status(201).json(data);
  }

  async update(
    req: AuthenticatedTypedRequest<UpdateResumeInput> & { file?: Express.Multer.File },
    res: Response
  ) {
    const resumeRepository = getResumeRepository();

    const userId = req.userId;
    const { id, keywords } = req.body;

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
        message: 'You are not authorized to update this resume',
      };
      res.status(403).json(data);
      return;
    }

    // Update file if provided
    if (req.file) {
      resume.file = req.file.buffer;
      resume.fileName = req.file.originalname;
      resume.fileSize = req.file.size;
    }

    // Update keywords if provided
    if (keywords) {
      resume.keywords = keywords;
    }

    await resumeRepository.save(resume);

    const data: ApiResponse<ResumeMetadataResponse> = {
      success: true,
      message: 'Resume updated successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        keywords: resume.keywords,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
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
        message: 'You are not authorized to delete this resume',
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
        'resume.fileSize',
        'resume.keywords',
        'resume.createdAt',
        'resume.updatedAt',
      ]);

    if (personaId) {
      queryBuilder.andWhere('persona.id = :personaId', { personaId });
    }

    const resumes = await queryBuilder.getMany();

    const resumeResponses: ResumeMetadataResponse[] = resumes.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileSize: r.fileSize,
      keywords: r.keywords,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    const data: ApiResponse<ResumeMetadataResponse[]> = {
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
        message: 'You are not authorized to access this resume',
      };
      res.status(403).json(data);
      return;
    }

    // Determine file extension
    const fileName = resume.fileName.toLowerCase();
    const extension = fileName.split('.').pop();

    // For TXT files, return text content for browser viewing
    if (extension === 'txt') {
      const textContent = resume.file.toString('utf-8');
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
    const data: ApiResponse<ResumeFullResponse> = {
      success: true,
      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        file: resume.file,
        keywords: resume.keywords,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    };
    res.status(200).json(data);
  }

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

  async setActive(req: AuthenticatedTypedRequest<{ id: string }>, res: Response) {
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
        message: 'You are not authorized to update this resume',
      };
      res.status(403).json(data);
      return;
    }

    // Set all resumes of this persona to inactive
    await resumeRepository.update({ persona: { id: resume.persona.id } }, { active: false });

    // Set the selected resume to active
    resume.active = true;
    await resumeRepository.save(resume);

    const data: ApiResponse<ResumeMetadataResponse> = {
      success: true,
      message: 'Resume set as active successfully',
      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        keywords: resume.keywords,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    };
    res.status(200).json(data);
  }
}

export default new ResumeController();
