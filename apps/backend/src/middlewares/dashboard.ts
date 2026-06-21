import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

const DashboardQuerySchema = z.object({
  range: z.enum(['month', 'threeMonths', 'all']).default('month'),
  topAtsLimit: z.coerce.number().int().min(1).max(10).default(5),
  eventsLimit: z.coerce.number().int().min(1).max(20).default(5),
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

export function dashboardValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = DashboardQuerySchema.parse(req.query);
    (req as Request & { parsedQuery: DashboardQuery }).parsedQuery = parsed;
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
      message: 'Invalid query parameters',
    };
    res.status(400).json(data);
  }
}
