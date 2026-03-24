import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

// Schema for getting a resume by ID
const GetResumeByIdSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for deleting a resume
const DeleteResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for updating a resume (file and keywords are optional)
const UpdateResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  keywords: z.array(z.string()).optional(),
});

// Schema for creating a resume
const CreateResumeSchema = z.object({
  personaId: z.uuidv4('Invalid persona ID'),
  keywords: z.array(z.string()).optional(),
});

export type GetResumeByIdInput = z.input<typeof GetResumeByIdSchema>;
export type DeleteResumeInput = z.input<typeof DeleteResumeSchema>;
export type UpdateResumeInput = z.input<typeof UpdateResumeSchema>;
export type CreateResumeInput = z.input<typeof CreateResumeSchema>;

export function getResumeByIdValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetResumeByIdSchema.parse(req.params);
    (req as Request & { validatedParams: z.infer<typeof GetResumeByIdSchema> }).validatedParams =
      parsed;
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

export function deleteResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeleteResumeSchema.parse(req.body);
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

export function updateResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse keywords from body if it's a string (form-data)
    if (req.body.keywords && typeof req.body.keywords === 'string') {
      try {
        req.body.keywords = JSON.parse(req.body.keywords);
      } catch {
        // If not valid JSON, treat as comma-separated
        req.body.keywords = req.body.keywords.split(',').map((k: string) => k.trim());
      }
    }
    req.body = UpdateResumeSchema.parse(req.body);
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

export function createResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse keywords from body if it's a string (form-data)
    if (req.body.keywords && typeof req.body.keywords === 'string') {
      try {
        req.body.keywords = JSON.parse(req.body.keywords);
      } catch {
        // If not valid JSON, treat as comma-separated
        req.body.keywords = req.body.keywords.split(',').map((k: string) => k.trim());
      }
    }
    req.body = CreateResumeSchema.parse(req.body);
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
