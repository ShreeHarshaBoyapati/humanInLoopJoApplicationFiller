import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

// Schema for creating a persona
const CreatePersonaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  keywords: z.array(z.string()).default([]),
});

// Schema for updating a persona
const UpdatePersonaSchema = z.object({
  id: z.uuidv4('Invalid persona ID'),
  title: z.string().min(1, 'Title is required').optional(),
  keywords: z.array(z.string()).optional(),
});

// Schema for deleting a persona
const DeletePersonaSchema = z.object({
  id: z.uuidv4('Invalid persona ID'),
});

export type CreatePersonaInput = z.input<typeof CreatePersonaSchema>;
export type UpdatePersonaInput = z.input<typeof UpdatePersonaSchema>;
export type DeletePersonaInput = z.input<typeof DeletePersonaSchema>;

export function createPersonaValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = CreatePersonaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }

    const data: ApiResponse = {
      success: false,
      message: 'Invalid input',
    };
    res.status(400).json(data);
    return;
  }
}

export function updatePersonaValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdatePersonaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }

    const data: ApiResponse = {
      success: false,
      message: 'Invalid input',
    };
    res.status(400).json(data);
    return;
  }
}

export function deletePersonaValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeletePersonaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }

    const data: ApiResponse = {
      success: false,
      message: 'Invalid input',
    };
    res.status(400).json(data);
    return;
  }
}
