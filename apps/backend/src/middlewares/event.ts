import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { ApiResponse } from '@repo/shared-types';
import type { EventField } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  date: z.string().regex(DATE_REGEX, 'Invalid date format (expected YYYY-MM-DD)'),
  time: z
    .union([z.string().regex(TIME_REGEX, 'Invalid time format (expected HH:mm)'), z.null()])
    .nullable()
    .default(null),
  tagId: z.uuid('Invalid tag ID'),
  jobId: z.uuid('Invalid job ID').nullable().default(null),
});

const UpdateEventSchema = z.object({
  id: z.uuid('Invalid event ID'),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  date: z.string().regex(DATE_REGEX, 'Invalid date format (expected YYYY-MM-DD)').optional(),
  time: z
    .union([z.string().regex(TIME_REGEX, 'Invalid time format (expected HH:mm)'), z.null()])
    .nullable()
    .optional(),
  tagId: z.uuid('Invalid tag ID').optional(),
  jobId: z.uuid('Invalid job ID').nullable().optional(),
  isCompleted: z.boolean().optional(),
});

const DeleteEventSchema = z.object({
  id: z.uuid('Invalid event ID'),
});

const validEventFields: readonly EventField[] = [
  'id',
  'title',
  'description',
  'date',
  'time',
  'tagId',
  'jobId',
  'isCompleted',
  'completedAt',
  'createdAt',
  'updatedAt',
] as const;

const MAX_DATE_RANGE_DAYS = 92;

const GetEventsSchema = z
  .object({
    mode: z.enum(['list', 'dots']).default('list'),
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: z.string().regex(DATE_REGEX, 'Invalid from date').optional(),
    to: z.string().regex(DATE_REGEX, 'Invalid to date').optional(),
    tagId: z.uuid('Invalid tag ID').optional(),
    jobId: z.uuid('Invalid job ID').optional(),
    includeCompleted: z.coerce.boolean().default(true),
    select: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const fields = val.split(',').map((f) => f.trim());
        return fields.filter((f): f is EventField =>
          (validEventFields as readonly string[]).includes(f)
        );
      }),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to) {
      const fromMs = Date.parse(value.from);
      const toMs = Date.parse(value.to);
      if (!Number.isNaN(fromMs) && !Number.isNaN(toMs)) {
        const diffDays = (toMs - fromMs) / (1000 * 60 * 60 * 24);
        if (diffDays > MAX_DATE_RANGE_DAYS) {
          ctx.addIssue({
            code: 'custom',
            path: ['to'],
            message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
          });
        }
      }
    }
  });

export type CreateEventInput = z.input<typeof CreateEventSchema>;
export type UpdateEventInput = z.input<typeof UpdateEventSchema>;
export type DeleteEventInput = z.input<typeof DeleteEventSchema>;
export type GetEventsInput = z.input<typeof GetEventsSchema>;
export type GetEventsInfer = z.infer<typeof GetEventsSchema>;

function validationErrorResponse(res: Response, error: ZodError): void {
  const data: ApiResponse = {
    success: false,
    message: flattenZodErrorToString(error),
  };
  res.status(400).json(data);
}

export function createEventValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = CreateEventSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function updateEventValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateEventSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function deleteEventValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeleteEventSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid input' });
  }
}

export function getEventsValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetEventsSchema.parse(req.query);
    (req as Request & { parsedQuery: z.infer<typeof GetEventsSchema> }).parsedQuery = parsed;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      validationErrorResponse(res, error);
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid query parameters' });
  }
}
