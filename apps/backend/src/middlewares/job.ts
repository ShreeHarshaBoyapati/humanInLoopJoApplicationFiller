import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

// Schema for creating a job
const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  tags: z.array(z.string()).default([]),
  personaId: z.string().nullable().optional(),
  status: z
    .enum(['draft', 'applied', 'interview', 'offer', 'rejected', 'active', 'archived'])
    .default('draft'),
  acceptanceLevel: z.number().int().min(0).max(100).default(0),
  companyName: z.string().default(''),
  notes: z.string().default(''),
  requirements: z.string().default(''),
  metaData: z.record(z.string(), z.unknown()).default({}),
  description: z.string().default(''),
  highlights: z.record(z.string(), z.unknown()).default({}),
  keySkills: z.array(z.string()).default([]),
});

// Schema for updating a job
const UpdateJobSchema = z.object({
  id: z.uuidv4('Invalid job ID'),
  title: z.string().min(1, 'Title is required').optional(),
  tags: z.array(z.string()).optional(),
  personaId: z.string().nullable().optional(),
  status: z
    .enum(['draft', 'applied', 'interview', 'offer', 'rejected', 'active', 'archived'])
    .optional(),
  acceptanceLevel: z.number().int().min(0).max(100).optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  requirements: z.string().optional(),
  metaData: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
  highlights: z.record(z.string(), z.unknown()).optional(),
  keySkills: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
  primaryResultId: z.string().nullable().optional(),
});

// Schema for deleting a job
const DeleteJobSchema = z.object({
  id: z.uuidv4('Invalid job ID'),
});

// Valid fields that can be selected
const validJobFields = [
  'id',
  'title',
  'tags',
  'personaId',
  'status',
  'acceptanceLevel',
  'companyName',
  'notes',
  'requirements',
  'metaData',
  'description',
  'highlights',
  'keySkills',
  'favorite',
  'primaryResultId',
  'dataUpdatedAt',
  'createdAt',
  'updatedAt',
] as const;

// Schema for getting jobs with pagination, filtering, searching, sorting, and field selection
const GetJobsSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Filtering
  id: z.uuid('Invalid job ID').optional(),
  status: z
    .enum(['draft', 'applied', 'interview', 'offer', 'rejected', 'active', 'archived'])
    .optional(),
  persona: z.string().optional(),
  favorite: z.coerce.boolean().optional(),

  // Searching
  search: z.string().optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'acceptanceLevel']).default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),

  // Field selection (comma-separated list of fields)
  select: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const fields = val.split(',').map((f) => f.trim());
      // Filter to only valid fields
      return fields.filter((f) => validJobFields.includes(f as (typeof validJobFields)[number]));
    }),
});

export type JobField = (typeof validJobFields)[number];
export type CreateJobInput = z.input<typeof CreateJobSchema>;

export function createJobValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = CreateJobSchema.parse(req.body);
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

export type UpdateJobInput = z.input<typeof UpdateJobSchema>;

export function updateJobValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateJobSchema.parse(req.body);
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

export type DeleteJobInput = z.input<typeof DeleteJobSchema>;
export function deleteJobValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeleteJobSchema.parse(req.body);
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

export type GetJobsInput = z.input<typeof GetJobsSchema>;
export type GetJobsInfer = z.infer<typeof GetJobsSchema>;
export function getJobsValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetJobsSchema.parse(req.query);
    (req as Request & { parsedQuery: z.infer<typeof GetJobsSchema> }).parsedQuery = parsed;
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
    return;
  }
}
