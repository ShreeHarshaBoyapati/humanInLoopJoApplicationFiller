import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserController from '../src/controllers/user-controller.js';
import { getUserRepository } from '../src/database/repositories/index.js';
import { createMockRepository } from './mocks/repository.mock.js';
import { createMockRequest, createMockResponse } from './mocks/express.mock.js';
import { hashPassword } from '../src/utils/auth.js';
import type { Request, Response } from '../src/types/index.js';

vi.mock('../src/database/repositories/index.js', () => ({
  getUserRepository: vi.fn(),
}));

describe('UserController.register', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(getUserRepository).mockReturnValue(mockRepo as never);
    res = createMockResponse();
  });

  it('registers new user successfully', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue({ id: 'uuid-1', email: 'test@test.com' });

    const req = createMockRequest({
      body: { email: 'test@test.com', password: 'Pass123!' },
    });

    await UserController.register(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('rejects duplicate email', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'existing', email: 'test@test.com' });

    const req = createMockRequest({
      body: { email: 'test@test.com', password: 'Pass123!' },
    });

    await UserController.register(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User with this email already exists' })
    );
  });
});

describe('UserController.login', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(getUserRepository).mockReturnValue(mockRepo as never);
    res = createMockResponse();
  });

  it('logs in with valid credentials', async () => {
    const hashedPwd = await hashPassword('Pass123!');
    mockRepo.findOne.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@test.com',
      password: hashedPwd,
    });
    mockRepo.save.mockResolvedValue({});

    const req = createMockRequest({
      body: { email: 'test@test.com', password: 'Pass123!' },
    });

    await UserController.login(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
  });

  it('rejects non-existent user', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      body: { email: 'unknown@test.com', password: 'Pass123!' },
    });

    await UserController.login(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password' })
    );
  });

  it('rejects wrong password', async () => {
    const hashedPwd = await hashPassword('CorrectPass1!');
    mockRepo.findOne.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@test.com',
      password: hashedPwd,
    });

    const req = createMockRequest({
      body: { email: 'test@test.com', password: 'WrongPass1!' },
    });

    await UserController.login(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password' })
    );
  });

  it('rejects incorrect password hash comparison', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@test.com',
      password: 'not-a-hash',
    });

    const req = createMockRequest({
      body: { email: 'test@test.com', password: 'Pass123!' },
    });

    await UserController.login(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('UserController.logout', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(getUserRepository).mockReturnValue(mockRepo as never);
    res = createMockResponse();
  });

  it('logs out user successfully', async () => {
    mockRepo.update.mockResolvedValue({});

    const req = createMockRequest({ userId: 'uuid-1' });

    await UserController.logout(req as Request, res as unknown as Response);

    expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', { sessionId: null });
    expect(res.clearCookie).toHaveBeenCalledWith('token', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('UserController.update', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(getUserRepository).mockReturnValue(mockRepo as never);
    res = createMockResponse();
  });

  it('updates email successfully', async () => {
    mockRepo.findOne
      .mockResolvedValueOnce({ id: 'uuid-1', email: 'old@test.com', password: 'hash' })
      .mockResolvedValueOnce(null);
    mockRepo.save.mockResolvedValue({ id: 'uuid-1', email: 'new@test.com' });

    const req = createMockRequest({
      userId: 'uuid-1',
      body: { email: 'new@test.com' },
    });

    await UserController.update(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects when user not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      userId: 'non-existent',
      body: { email: 'new@test.com' },
    });

    await UserController.update(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
  });

  it('rejects email already in use', async () => {
    mockRepo.findOne
      .mockResolvedValueOnce({ id: 'uuid-1', email: 'old@test.com', password: 'hash' })
      .mockResolvedValueOnce({ id: 'uuid-2', email: 'taken@test.com' });

    const req = createMockRequest({
      userId: 'uuid-1',
      body: { email: 'taken@test.com' },
    });

    await UserController.update(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email is already in use' })
    );
  });

  it('skips email check when same email provided', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'uuid-1', email: 'same@test.com', password: 'hash' });
    mockRepo.save.mockResolvedValue({ id: 'uuid-1', email: 'same@test.com' });

    const req = createMockRequest({
      userId: 'uuid-1',
      body: { email: 'same@test.com' },
    });

    await UserController.update(req as Request, res as unknown as Response);

    expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('UserController.delete', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(getUserRepository).mockReturnValue(mockRepo as never);
    res = createMockResponse();
  });

  it('deletes user successfully', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'uuid-1', email: 'test@test.com' });
    mockRepo.remove.mockResolvedValue({});

    const req = createMockRequest({ userId: 'uuid-1' });

    await UserController.delete(req as Request, res as unknown as Response);

    expect(mockRepo.remove).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects when user not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({ userId: 'non-existent' });

    await UserController.delete(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
  });
});
