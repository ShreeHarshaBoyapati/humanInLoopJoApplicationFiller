import { ILike } from 'typeorm';
import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import {
  getPersonaRepository,
  getResumeRepository,
  getResumeVersionRepository,
} from '../database/repositories/index.js';
import type {
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
} from '../middlewares/persona.js';
import type {
  ApiResponse,
  Persona,
  PaginationParams,
  PaginatedPersonasResponse,
} from '@repo/shared-types';
import { logger } from '../utils/index.js';
import * as wsHub from '../realtime/ws-hub.js';
import { personaToMetadata } from '../realtime/payload-mappers.js';

const COUNT_BATCH_SIZE = 25;

async function getResumesCountByPersonaIds(personaIds: string[]): Promise<Map<string, number>> {
  const resumeRepository = getResumeRepository();
  const counts = new Map<string, number>();
  if (personaIds.length === 0) return counts;

  for (const id of personaIds) {
    counts.set(id, 0);
  }

  const batches: string[][] = [];
  for (let i = 0; i < personaIds.length; i += COUNT_BATCH_SIZE) {
    batches.push(personaIds.slice(i, i + COUNT_BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const rows = (await resumeRepository
        .createQueryBuilder('resume')
        .select('resume.personaId', 'personaId')
        .addSelect('COUNT(resume.id)', 'count')
        .where('resume.personaId IN (:...batch)', { batch })
        .andWhere('resume.isDeleted = :isDeleted', { isDeleted: false })
        .groupBy('resume.personaId')
        .getRawMany()) as Array<{ personaId: string; count: string }>;
      return rows;
    })
  );

  for (const rows of batchResults) {
    for (const row of rows) {
      counts.set(row.personaId, parseInt(row.count, 10));
    }
  }

  return counts;
}

class PersonaController {
  async create(req: AuthenticatedTypedRequest<CreatePersonaInput>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { title, keywords } = req.body;

    const existingPersona = await personaRepository.findOne({
      where: { title, user: { id: userId }, isDeleted: false },
    });

    if (existingPersona) {
      const data: ApiResponse = {
        success: false,
        message: 'A persona with this title already exists',
      };
      res.status(400).json(data);
      return;
    }

    const existingPersonasCount = await personaRepository.count({
      where: { user: { id: userId }, isDeleted: false },
    });
    const isFirstPersona = existingPersonasCount === 0;

    const persona = personaRepository.create({
      title,
      keywords: keywords || [],
      user: { id: userId },
      active: isFirstPersona ? true : false,
    });

    await personaRepository.save(persona);

    wsHub.emit(userId, 'persona', 'create', persona.id, undefined, undefined, req.realtimeClientId);

    const data: ApiResponse<Persona> = {
      success: true,
      message: 'Persona created successfully',
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
        active: persona.active,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
      },
    };
    res.status(201).json(data);
  }

  async update(req: AuthenticatedTypedRequest<UpdatePersonaInput>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { id, ...updateData } = req.body;

    const persona = await personaRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!persona) {
      const data: ApiResponse = {
        success: false,
        message: 'Persona not found',
      };
      res.status(404).json(data);
      return;
    }

    if (persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'You are not authorized to update this persona',
      };
      res.status(403).json(data);
      return;
    }

    if (updateData.title && updateData.title !== persona.title) {
      const existingPersona = await personaRepository.findOne({
        where: { title: updateData.title, user: { id: userId }, isDeleted: false },
      });

      if (existingPersona) {
        const data: ApiResponse = {
          success: false,
          message: 'A persona with this title already exists',
        };
        res.status(400).json(data);
        return;
      }
    }

    Object.assign(persona, updateData);

    await personaRepository.save(persona);

    wsHub.emit(
      userId,
      'persona',
      'update',
      persona.id,
      personaToMetadata(persona),
      undefined,
      req.realtimeClientId
    );

    const data: ApiResponse<Persona> = {
      success: true,
      message: 'Persona updated successfully',
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
        active: persona.active,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  async delete(req: AuthenticatedTypedRequest<DeletePersonaInput>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { id } = req.body;

    const persona = await personaRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!persona) {
      const data: ApiResponse = {
        success: false,
        message: 'Persona not found',
      };
      res.status(404).json(data);
      return;
    }

    if (persona.user.id !== userId) {
      const data: ApiResponse = {
        success: false,
        message: 'You are not authorized to delete this persona',
      };
      res.status(403).json(data);
      return;
    }

    if (req.clientAborted) {
      logger.info({ id: persona.id }, 'Delete persona aborted by client; skipping DB write');
      return;
    }

    persona.isDeleted = true;
    await personaRepository.save(persona);

    // Soft delete all resumes and their versions for this persona
    const resumeRepository = getResumeRepository();
    const versionRepository = getResumeVersionRepository();

    const resumes = await resumeRepository.find({
      where: { persona: { id: id } },
    });

    await Promise.all(
      resumes.map(async (resume) => {
        resume.isDeleted = true;

        const versions = await versionRepository.find({
          where: { resume: { id: resume.id } },
        });

        await Promise.all(
          versions.map((version) => {
            version.isDeleted = true;
            return versionRepository.save(version);
          })
        );

        return resumeRepository.save(resume);
      })
    );

    wsHub.emit(userId, 'persona', 'delete', persona.id, undefined, undefined, req.realtimeClientId);

    const data: ApiResponse = {
      success: true,
      message: 'Persona deleted successfully',
    };

    res.status(200).json(data);
  }

  async get(req: AuthenticatedTypedRequest<PaginationParams>, res: Response) {
    const personaRepository = getPersonaRepository();
    const userId = req.userId;
    const { page = '1', limit = '10', search = '' } = req.query;

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const searchQuery = String(search).trim();

    const items: Persona[] = [];

    if (searchQuery) {
      const whereClause: Record<string, unknown> = {
        user: { id: userId },
        title: ILike(`%${searchQuery}%`),
        isDeleted: false,
      };

      const [total, personas] = await Promise.all([
        personaRepository.count({ where: whereClause }),
        personaRepository.find({
          where: whereClause,
          order: { createdAt: 'DESC' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      const counts = await getResumesCountByPersonaIds(personas.map((p) => p.id));

      for (const p of personas) {
        items.push({
          id: p.id,
          title: p.title,
          keywords: p.keywords,
          active: p.active,
          resumesCount: counts.get(p.id) ?? 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }

      const data: ApiResponse<PaginatedPersonasResponse> = {
        success: true,
        data: {
          items,
          total: total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
      res.status(200).json(data);
      return;
    }

    const totalWhere: Record<string, unknown> = { user: { id: userId }, isDeleted: false };
    const total = await personaRepository.count({
      where: totalWhere,
    });

    if (pageNum === 1) {
      const [activePersona, nonActivePersonas] = await Promise.all([
        personaRepository.findOne({
          where: { user: { id: userId }, active: true, isDeleted: false },
        }),
        personaRepository.find({
          where: { user: { id: userId }, active: false, isDeleted: false },
          order: { createdAt: 'DESC' },
          take: limitNum,
        }),
      ]);

      const visibleNonActivePersonas = activePersona
        ? nonActivePersonas.slice(0, limitNum - 1)
        : nonActivePersonas.slice(0, limitNum);

      const personaIdsForCounts: string[] = [];
      if (activePersona) personaIdsForCounts.push(activePersona.id);
      for (const p of visibleNonActivePersonas) personaIdsForCounts.push(p.id);

      const counts = await getResumesCountByPersonaIds(personaIdsForCounts);

      if (activePersona) {
        items.push({
          id: activePersona.id,
          title: activePersona.title,
          keywords: activePersona.keywords,
          active: activePersona.active,
          resumesCount: counts.get(activePersona.id) ?? 0,
          createdAt: activePersona.createdAt,
          updatedAt: activePersona.updatedAt,
        });
      }

      for (const p of visibleNonActivePersonas) {
        items.push({
          id: p.id,
          title: p.title,
          keywords: p.keywords,
          active: p.active,
          resumesCount: counts.get(p.id) ?? 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
    } else {
      const hasActivePersona = await personaRepository.count({
        where: { user: { id: userId }, active: true, isDeleted: false },
      });

      const skip = hasActivePersona > 0 ? (pageNum - 1) * limitNum - 1 : (pageNum - 1) * limitNum;

      const nonActivePersonas = await personaRepository.find({
        where: { user: { id: userId }, active: false, isDeleted: false },
        order: { createdAt: 'DESC' },
        skip: Math.max(0, skip),
        take: limitNum,
      });

      const counts = await getResumesCountByPersonaIds(nonActivePersonas.map((p) => p.id));

      for (const p of nonActivePersonas) {
        items.push({
          id: p.id,
          title: p.title,
          keywords: p.keywords,
          active: p.active,
          resumesCount: counts.get(p.id) ?? 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
    }

    const data: ApiResponse<PaginatedPersonasResponse> = {
      success: true,
      data: {
        items,
        total: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
    res.status(200).json(data);
  }

  async getActive(req: AuthenticatedTypedRequest<null>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;

    const persona = await personaRepository.findOne({
      where: { user: { id: userId }, active: true, isDeleted: false },
    });

    if (!persona) {
      const data: ApiResponse = {
        success: false,
        message: 'No active persona found',
      };
      res.status(404).json(data);
      return;
    }

    const counts = await getResumesCountByPersonaIds([persona.id]);

    const data: ApiResponse<Persona> = {
      success: true,
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
        active: persona.active,
        resumesCount: counts.get(persona.id) ?? 0,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
      },
    };
    res.status(200).json(data);
  }
}

export default new PersonaController();
