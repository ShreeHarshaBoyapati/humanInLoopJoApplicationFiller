import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from './mocks/express.mock.js';
import {
  createJobValidation,
  updateJobValidation,
  deleteJobValidation,
  getJobsValidation,
} from '../src/middlewares/job.js';
import type { Request, Response, NextFunction } from '../src/types/index.js';

describe('createJobValidation', () => {
  it('passes valid job creation', () => {
    const req = createMockRequest({ body: { title: 'Developer' } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects missing title', () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects empty title', () => {
    const req = createMockRequest({ body: { title: '' } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid status', () => {
    const req = createMockRequest({ body: { title: 'Dev', status: 'invalid' } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects acceptanceLevel > 100', () => {
    const req = createMockRequest({ body: { title: 'Dev', acceptanceLevel: 150 } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects acceptanceLevel < 0', () => {
    const req = createMockRequest({ body: { title: 'Dev', acceptanceLevel: -5 } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects non-integer acceptanceLevel', () => {
    const req = createMockRequest({ body: { title: 'Dev', acceptanceLevel: 50.5 } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects tags as string instead of array', () => {
    const req = createMockRequest({ body: { title: 'Dev', tags: 'react' } });
    const res = createMockResponse();
    const next = createMockNext();

    createJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateJobValidation', () => {
  const validUUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  it('passes valid update', () => {
    const req = createMockRequest({ body: { id: validUUID, title: 'Updated' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects missing id', () => {
    const req = createMockRequest({ body: { title: 'Updated' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid UUID format', () => {
    const req = createMockRequest({ body: { id: 'not-a-uuid' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects empty string id', () => {
    const req = createMockRequest({ body: { id: '' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects SQL injection in id', () => {
    const req = createMockRequest({ body: { id: "'; DROP TABLE jobs;--" } });
    const res = createMockResponse();
    const next = createMockNext();

    updateJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deleteJobValidation', () => {
  const validUUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  it('passes valid delete request', () => {
    const req = createMockRequest({ body: { id: validUUID } });
    const res = createMockResponse();
    const next = createMockNext();

    deleteJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects missing id', () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();
    const next = createMockNext();

    deleteJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid id format', () => {
    const req = createMockRequest({ body: { id: '123' } });
    const res = createMockResponse();
    const next = createMockNext();

    deleteJobValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getJobsValidation', () => {
  it('passes with no query params (uses defaults)', () => {
    const req = createMockRequest({ query: {} });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('passes with valid filters', () => {
    const req = createMockRequest({
      query: { page: '2', limit: '20', status: 'active', sortBy: 'createdAt', sortOrder: 'ASC' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects page < 1', () => {
    const req = createMockRequest({ query: { page: '0' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects negative page', () => {
    const req = createMockRequest({ query: { page: '-1' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects limit > 100', () => {
    const req = createMockRequest({ query: { limit: '500' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid status filter', () => {
    const req = createMockRequest({ query: { status: 'unknown' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid sortBy', () => {
    const req = createMockRequest({ query: { sortBy: 'password' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid sortOrder', () => {
    const req = createMockRequest({ query: { sortOrder: 'RANDOM' } });
    const res = createMockResponse();
    const next = createMockNext();

    getJobsValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
