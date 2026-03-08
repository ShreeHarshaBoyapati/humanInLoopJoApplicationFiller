import type { Request, Response, NextFunction } from '../types/index.js';
import * as z from 'zod';
import { ApiResponse } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';

const UpdateApiKeyObj = z.object({
  providerName: z.enum(['gemini', 'anthropic']),
  apiKey: z.string().min(1, 'API key cannot be empty'),
  model: z.string().min(1, 'Model cannot be empty'),
});

export type UpdateApiKeyInputType = z.infer<typeof UpdateApiKeyObj>;

export function updateApiKeyValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateApiKeyObj.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
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
