import type { Request, Response, NextFunction } from '../types/index.js';
import * as z from 'zod';
import { ApiResponse } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';

const UpdateApiKeyObj = z.object({
  id: z.uuid('Invalid ID format').optional(),
  providerName: z.enum(['gemini', 'openai', 'anthropic', 'groq', 'mistral', 'ollama', 'custom']),
  credentials: z.record(z.string(), z.string()),
  model: z.string().min(1, 'Model cannot be empty'),
});

const TestConnectionObj = z.object({
  providerName: z.enum(['gemini', 'openai', 'anthropic', 'groq', 'mistral', 'ollama', 'custom']),
  credentials: z.record(z.string(), z.string()),
});

export type UpdateApiKeyInputType = z.infer<typeof UpdateApiKeyObj>;
export type TestConnectionInputType = z.infer<typeof TestConnectionObj>;

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

export function testConnectionValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = TestConnectionObj.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: flattenZodErrorToString(error) });
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}
