import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { ApiResponse } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';

const CreateTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const UpdateTagSchema = z.object({
  id: z.uuid('Invalid tag ID'),
  name: z.string().min(1, 'Name is required').optional(),
});

const DeleteTagSchema = z.object({
  id: z.uuid('Invalid tag ID'),
});

const GetTagsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateTagInput = z.input<typeof CreateTagSchema>;
export type UpdateTagInput = z.input<typeof UpdateTagSchema>;
export type DeleteTagInput = z.input<typeof DeleteTagSchema>;
export type GetTagsInput = z.input<typeof GetTagsSchema>;
export type GetTagsInfer = z.infer<typeof GetTagsSchema>;

function validationErrorResponse(res: Response, error: ZodError): void {
  const data: ApiResponse = {
    success: false,
    message: flattenZodErrorToString(error),
  };
  res.status(400).json(data);
}

export function createTagValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = CreateTagSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function updateTagValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateTagSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function deleteTagValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeleteTagSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function getTagsValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetTagsSchema.parse(req.query);
    (req as Request & { parsedQuery: z.infer<typeof GetTagsSchema> }).parsedQuery = parsed;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid query parameters' });
  }
}
