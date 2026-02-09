import { describe, it, expect, vi } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from './mocks/express.mock.js';
import {
  registerInputValidation,
  loginInputValidation,
  updateUserValidation,
} from '../src/middlewares/user.js';
import type { Request, Response, NextFunction } from '../src/types/index.js';

vi.mock('../src/database/repositories/index.js', () => ({
  getUserRepository: vi.fn(),
}));

process.env.NODE_JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars-long';

describe('registerInputValidation', () => {
  it('passes valid registration payload', () => {
    const req = createMockRequest({ body: { email: 'valid@test.com', password: 'Valid123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects missing email', () => {
    const req = createMockRequest({ body: { password: 'Valid123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', () => {
    const req = createMockRequest({ body: { email: 'not-an-email', password: 'Valid123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects short password', () => {
    const req = createMockRequest({ body: { email: 'valid@test.com', password: 'Ab1!' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects password without number', () => {
    const req = createMockRequest({ body: { email: 'valid@test.com', password: 'NoNumbers!' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects password without special char', () => {
    const req = createMockRequest({ body: { email: 'valid@test.com', password: 'NoSpecial123' } });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects empty body', () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects null body', () => {
    const req = createMockRequest({ body: null });
    const res = createMockResponse();
    const next = createMockNext();

    registerInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('loginInputValidation', () => {
  it('passes valid login payload', () => {
    const req = createMockRequest({ body: { email: 'user@test.com', password: 'Pass123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    loginInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects missing password', () => {
    const req = createMockRequest({ body: { email: 'user@test.com' } });
    const res = createMockResponse();
    const next = createMockNext();

    loginInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password' })
    );
  });

  it('rejects invalid email', () => {
    const req = createMockRequest({ body: { email: 'bad', password: 'Pass123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    loginInputValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateUserValidation', () => {
  it('passes valid email update', () => {
    const req = createMockRequest({ body: { email: 'new@test.com' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateUserValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('passes valid password update', () => {
    const req = createMockRequest({ body: { password: 'NewPass123!' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateUserValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('rejects empty update', () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();
    const next = createMockNext();

    updateUserValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects weak password in update', () => {
    const req = createMockRequest({ body: { password: 'weak' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateUserValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid email format in update', () => {
    const req = createMockRequest({ body: { email: 'not-valid' } });
    const res = createMockResponse();
    const next = createMockNext();

    updateUserValidation(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
