import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

const UpdateWeeklyGoalSchema = z.object({
  applicationsTarget: z.number().int().min(1),
  interviewsTarget: z.number().int().min(1),
});

export type UpdateWeeklyGoalInput = z.infer<typeof UpdateWeeklyGoalSchema>;

export function updateWeeklyGoalValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateWeeklyGoalSchema.parse(req.body);
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
  }
}
