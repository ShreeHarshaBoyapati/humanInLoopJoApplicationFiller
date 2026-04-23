import { Like } from 'typeorm';
import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getPersonaRepository } from '../database/repositories/index.js';
import type {
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
} from '../middlewares/persona.js';
import type { ApiResponse, Persona, PaginationParams } from '@repo/shared-types';

class PersonaController {
  async create(req: AuthenticatedTypedRequest<CreatePersonaInput>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { title, keywords } = req.body;

    // Check if title already exists for this user
    const existingPersona = await personaRepository.findOne({
      where: { title, user: { id: userId } },
    });

    if (existingPersona) {
      const data: ApiResponse = {
        success: false,
        message: 'A persona with this title already exists',
      };
      res.status(400).json(data);
      return;
    }

    // Check if this is the user's first persona
    const existingPersonasCount = await personaRepository.count({
      where: { user: { id: userId } },
    });
    const isFirstPersona = existingPersonasCount === 0;

    const persona = personaRepository.create({
      title,
      keywords: keywords || [],
      user: { id: userId },
      active: isFirstPersona ? true : false,
    });

    await personaRepository.save(persona);

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

    Object.assign(persona, updateData);

    await personaRepository.save(persona);

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

    const wasActive = persona.active;
    await personaRepository.remove(persona);

    // If deleted persona was active, mark the latest one as active
    if (wasActive) {
      const latestPersona = await personaRepository.findOne({
        where: { user: { id: userId } },
        order: { createdAt: 'DESC' },
      });

      if (latestPersona) {
        latestPersona.active = true;
        await personaRepository.save(latestPersona);
      }
    }

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

    // Build where clause for filtering
    const buildWhereClause = (isActive: boolean) => {
      const where: Record<string, unknown> = { user: { id: userId }, active: isActive };
      if (searchQuery) {
        where.title = Like(`%${searchQuery}%`);
      }
      return where;
    };

    // Get active persona (only if not searching)
    let activePersona = null;
    if (!searchQuery) {
      activePersona = await personaRepository.findOne({
        where: { user: { id: userId }, active: true },
        relations: ['resumes'],
      });
    }

    // Count total matching personas
    const total = await personaRepository.count({
      where: buildWhereClause(true),
    });

    const items: Persona[] = [];

    if (pageNum === 1) {
      // Page 1: active persona first (if not searching), then latest matching (limit + 1 to check for duplicate)
      if (activePersona) {
        items.push({
          id: activePersona.id,
          title: activePersona.title,
          keywords: activePersona.keywords,
          active: activePersona.active,
          resumesCount: activePersona.resumes ? activePersona.resumes.length : 0,
          createdAt: activePersona.createdAt,
          updatedAt: activePersona.updatedAt,
        });
      }

      // Get limit matching non-active personas (skip 0)
      const whereClause = buildWhereClause(false);
      const nonActivePersonas = await personaRepository.find({
        where: whereClause,
        relations: ['resumes'],
        order: { createdAt: 'DESC' },
        take: limitNum - 1,
      });

      for (const p of nonActivePersonas) {
        items.push({
          id: p.id,
          title: p.title,
          keywords: p.keywords,
          active: p.active,
          resumesCount: p.resumes ? p.resumes.length : 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
    } else {
      const skip = (pageNum - 1) * limitNum;
      const whereClause = buildWhereClause(false);
      const nonActivePersonas = await personaRepository.find({
        where: whereClause,
        relations: ['resumes'],
        order: { createdAt: 'DESC' },
        skip: skip,
        take: limitNum,
      });

      for (const p of nonActivePersonas) {
        items.push({
          id: p.id,
          title: p.title,
          keywords: p.keywords,
          active: p.active,
          resumesCount: p.resumes ? p.resumes.length : 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
    }

    const data: ApiResponse<{
      items: Persona[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> = {
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
      where: { user: { id: userId }, active: true },
      relations: ['resumes'],
    });

    if (!persona) {
      const data: ApiResponse = {
        success: false,
        message: 'No active persona found',
      };
      res.status(404).json(data);
      return;
    }

    const data: ApiResponse<Persona> = {
      success: true,
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
        active: persona.active,
        resumesCount: persona.resumes ? persona.resumes.length : 0,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  async setActive(req: AuthenticatedTypedRequest<{ id: string }>, res: Response) {
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
        message: 'You are not authorized to update this persona',
      };
      res.status(403).json(data);
      return;
    }

    // Set all personas of this user to inactive
    await personaRepository.update({ user: { id: userId } }, { active: false });

    // Set the selected persona to active
    persona.active = true;
    await personaRepository.save(persona);

    const data: ApiResponse<Persona> = {
      success: true,
      message: 'Persona set as active successfully',
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
}

export default new PersonaController();
