import type { Request, Response, NextFunction } from '../types/index.js';
import { z, ZodError } from 'zod';
import { flattenZodErrorToString } from '../utils/validations.js';
import { ApiResponse } from '@repo/shared-types';

// Schema for getting a resume by ID
const GetResumeByIdSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for parsing a resume
const ParseResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for deleting a resume
const DeleteResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for updating a resume (fileName optional)
const UpdateResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  fileName: z.string().optional(),
});

// Schema for creating a resume (only needs personaId now)
const CreateResumeSchema = z.object({
  personaId: z.uuidv4('Invalid persona ID'),
  fileName: z.string(),
  file: z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    base64: z.string(),
  }),
  keywords: z.array(z.string()).optional(),
  parsedData: z.record(z.string(), z.unknown()).optional(),
});

// Schema for setting active resume
const SetActiveResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
});

// Schema for getting a resume version by ID
const GetResumeVersionByIdSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionId: z.uuidv4('Invalid resume version ID'),
});

// Schema for creating a resume version
const CreateResumeVersionSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  keywords: z.array(z.string()).optional(),
  parsedData: z.record(z.string(), z.unknown()).optional(),
  comment: z.string().optional(),
});

// Schema for updating a resume version
const UpdateResumeVersionSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionId: z.uuidv4('Invalid resume version ID'),
  keywords: z.array(z.string()).optional(),
  parsedData: z.record(z.string(), z.unknown()).optional(),
  comment: z.string().optional(),
});

// Schema for deleting a resume version
const DeleteResumeVersionSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionId: z.uuidv4('Invalid resume version ID'),
});

// Schema for setting active resume version
const SetActiveResumeVersionSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionId: z.uuidv4('Invalid resume version ID'),
});

// Schema for branching a resume
const BranchResumeSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionId: z.uuidv4('Invalid resume version ID'),
  newFileName: z.string(),
});

// Schema for comparing versions
const CompareVersionsSchema = z.object({
  id: z.uuidv4('Invalid resume ID'),
  versionA: z.uuidv4('Invalid resume version ID'),
  versionB: z.uuidv4('Invalid resume version ID'),
});

export type GetResumeByIdInput = z.input<typeof GetResumeByIdSchema>;
export type DeleteResumeInput = z.input<typeof DeleteResumeSchema>;
export type UpdateResumeInput = z.input<typeof UpdateResumeSchema>;
export type CreateResumeInput = z.input<typeof CreateResumeSchema>;
export type ParseResumeInput = z.input<typeof ParseResumeSchema>;
export type SetActiveResumeInput = z.input<typeof SetActiveResumeSchema>;
export type GetResumeVersionByIdInput = z.input<typeof GetResumeVersionByIdSchema>;
export type CreateResumeVersionInput = z.input<typeof CreateResumeVersionSchema>;
export type UpdateResumeVersionInput = z.input<typeof UpdateResumeVersionSchema>;
export type DeleteResumeVersionInput = z.input<typeof DeleteResumeVersionSchema>;
export type SetActiveResumeVersionInput = z.input<typeof SetActiveResumeVersionSchema>;
export type BranchResumeInput = z.input<typeof BranchResumeSchema>;
export type CompareVersionsInput = z.input<typeof CompareVersionsSchema>;

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

export function parseResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ParseResumeSchema.parse(req.params);
    (req as Request & { validatedParams: z.infer<typeof ParseResumeSchema> }).validatedParams =
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

export function parseFileResumeValidation(req: Request, res: Response, next: NextFunction) {
  // Just validate that file is present
  if (!req.file) {
    const data: ApiResponse = {
      success: false,
      message: 'File is required',
    };
    res.status(400).json(data);
    return;
  }
  next();
}

export function setActiveResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = SetActiveResumeSchema.parse(req.body);
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

// Resume Version Validation Functions

export function getResumeVersionByIdValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetResumeVersionByIdSchema.parse(req.params);
    (
      req as Request & { validatedParams: z.infer<typeof GetResumeVersionByIdSchema> }
    ).validatedParams = parsed;
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

export function createResumeVersionValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse keywords from body if it's a string (form-data)
    if (req.body.keywords && typeof req.body.keywords === 'string') {
      try {
        req.body.keywords = JSON.parse(req.body.keywords);
      } catch {
        req.body.keywords = req.body.keywords.split(',').map((k: string) => k.trim());
      }
    }
    if (req.body.parsedData && typeof req.body.parsedData === 'string') {
      req.body.parsedData = JSON.parse(req.body.parsedData);
    }
    req.body = CreateResumeVersionSchema.parse(req.body);
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

export function updateResumeVersionValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse keywords from body if it's a string (form-data)
    if (req.body.keywords && typeof req.body.keywords === 'string') {
      try {
        req.body.keywords = JSON.parse(req.body.keywords);
      } catch {
        req.body.keywords = req.body.keywords.split(',').map((k: string) => k.trim());
      }
    }
    if (req.body.parsedData && typeof req.body.parsedData === 'string') {
      req.body.parsedData = JSON.parse(req.body.parsedData);
    }
    req.body = UpdateResumeVersionSchema.parse(req.body);
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

export function deleteResumeVersionValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = DeleteResumeVersionSchema.parse(req.body);
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

export function setActiveResumeVersionValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = SetActiveResumeVersionSchema.parse(req.body);
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

export function branchResumeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = BranchResumeSchema.parse(req.body);
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

export function compareVersionsValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = CompareVersionsSchema.parse(req.body);
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
