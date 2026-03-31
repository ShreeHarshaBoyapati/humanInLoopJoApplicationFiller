import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getPersonaRepository } from '../database/repositories/index.js';
import type {
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
} from '../middlewares/persona.js';
import type { ApiResponse, Persona } from '@repo/shared-types';

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

    await personaRepository.remove(persona);

    const data: ApiResponse = {
      success: true,
      message: 'Persona deleted successfully',
    };

    res.status(200).json(data);
  }

  async get(req: AuthenticatedTypedRequest<null>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;

    const personas = await personaRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });

    const personaData: Persona[] = personas.map((p) => ({
      id: p.id,
      title: p.title,
      keywords: p.keywords,
      active: p.active,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const data: ApiResponse<Persona[]> = {
      success: true,
      data: personaData,
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
