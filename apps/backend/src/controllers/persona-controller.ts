import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getPersonaRepository } from '../database/repositories/index.js';
import type {
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
} from '../middlewares/persona.js';
import { ApiResponse } from '@repo/shared-types';

interface PersonaResponse {
  id: string;
  title: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

class PersonaController {
  async create(req: AuthenticatedTypedRequest<CreatePersonaInput>, res: Response) {
    const personaRepository = getPersonaRepository();

    const userId = req.userId;
    const { title, keywords } = req.body;

    const persona = personaRepository.create({
      title,
      keywords: keywords || [],
      user: { id: userId },
    });

    await personaRepository.save(persona);

    const data: ApiResponse<PersonaResponse> = {
      success: true,
      message: 'Persona created successfully',
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
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

    const data: ApiResponse<PersonaResponse> = {
      success: true,
      message: 'Persona updated successfully',
      data: {
        id: persona.id,
        title: persona.title,
        keywords: persona.keywords,
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

    const personaResponses: PersonaResponse[] = personas.map((p) => ({
      id: p.id,
      title: p.title,
      keywords: p.keywords,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const data: ApiResponse<PersonaResponse[]> = {
      success: true,
      data: personaResponses,
    };
    res.status(200).json(data);
  }
}

export default new PersonaController();
