import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobController from '../src/controllers/job-controller.js';
import { getJobRepository, getUserRepository } from '../src/database/repositories/index.js';
import { createMockRepository, createMockQueryBuilder } from './mocks/repository.mock.js';
import { createMockRequest, createMockResponse } from './mocks/express.mock.js';
import type { Response, AuthenticatedRequest } from '../src/types/index.js';

vi.mock('../src/database/repositories/index.js', () => ({
  getJobRepository: vi.fn(),
  getUserRepository: vi.fn(),
}));

describe('JobController.create', () => {
  let mockJobRepo: ReturnType<typeof createMockRepository>;
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockJobRepo = createMockRepository();
    mockUserRepo = createMockRepository();
    vi.mocked(getJobRepository).mockReturnValue(mockJobRepo as never);
    vi.mocked(getUserRepository).mockReturnValue(mockUserRepo as never);
    res = createMockResponse();
  });

  it('creates job successfully', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
    mockJobRepo.create.mockReturnValue({ id: 'job-1', title: 'Dev' });
    mockJobRepo.save.mockResolvedValue({ id: 'job-1' });

    const req = createMockRequest({
      userId: 'user-1',
      body: { title: 'Developer', companyName: 'ACME' },
    });

    await JobController.create(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('throws when user not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      userId: 'non-existent',
      body: { title: 'Developer' },
    });

    await expect(
      JobController.create(req as AuthenticatedRequest, res as unknown as Response)
    ).rejects.toThrow('User not found');
  });
});

describe('JobController.update', () => {
  let mockJobRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockJobRepo = createMockRepository();
    vi.mocked(getJobRepository).mockReturnValue(mockJobRepo as never);
    res = createMockResponse();
  });

  it('updates job successfully', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Old',
      user: { id: 'user-1' },
    });
    mockJobRepo.save.mockResolvedValue({ id: 'job-1' });

    const req = createMockRequest({
      userId: 'user-1',
      body: { id: 'job-1', title: 'Updated' },
    });

    await JobController.update(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects non-existent job', async () => {
    mockJobRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      userId: 'user-1',
      body: { id: 'non-existent', title: 'New' },
    });

    await JobController.update(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Job not found' }));
  });

  it('rejects update by non-owner', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Old',
      user: { id: 'owner-id' },
    });

    const req = createMockRequest({
      userId: 'attacker-id',
      body: { id: 'job-1', title: 'Hacked' },
    });

    await JobController.update(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'You are not authorized to update this job' })
    );
  });

  it('prevents IDOR attack', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Victim Job',
      user: { id: 'victim-user' },
    });

    const req = createMockRequest({
      userId: 'malicious-user',
      body: { id: 'job-1', title: 'Stolen' },
    });

    await JobController.update(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockJobRepo.save).not.toHaveBeenCalled();
  });
});

describe('JobController.delete', () => {
  let mockJobRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockJobRepo = createMockRepository();
    vi.mocked(getJobRepository).mockReturnValue(mockJobRepo as never);
    res = createMockResponse();
  });

  it('deletes job successfully', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      user: { id: 'user-1' },
    });
    mockJobRepo.remove.mockResolvedValue({});

    const req = createMockRequest({
      userId: 'user-1',
      body: { id: 'job-1' },
    });

    await JobController.delete(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockJobRepo.remove).toHaveBeenCalled();
  });

  it('rejects non-existent job', async () => {
    mockJobRepo.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      userId: 'user-1',
      body: { id: 'ghost-job' },
    });

    await JobController.delete(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects delete by non-owner', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      user: { id: 'owner-id' },
    });

    const req = createMockRequest({
      userId: 'attacker-id',
      body: { id: 'job-1' },
    });

    await JobController.delete(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockJobRepo.remove).not.toHaveBeenCalled();
  });

  it('prevents unauthorized deletion via IDOR', async () => {
    mockJobRepo.findOne.mockResolvedValue({
      id: 'job-1',
      user: { id: 'real-owner' },
    });

    const req = createMockRequest({
      userId: 'malicious-actor',
      body: { id: 'job-1' },
    });

    await JobController.delete(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'You are not authorized to delete this job' })
    );
  });
});

describe('JobController.get', () => {
  let mockJobRepo: ReturnType<typeof createMockRepository>;
  let res: ReturnType<typeof createMockResponse>;
  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    mockJobRepo = createMockRepository();
    mockQb = createMockQueryBuilder();
    mockJobRepo.createQueryBuilder.mockReturnValue(mockQb as never);
    vi.mocked(getJobRepository).mockReturnValue(mockJobRepo as never);
    res = createMockResponse();
  });

  it('returns paginated jobs', async () => {
    const jobs = [
      { id: 'job-1', title: 'Dev' },
      { id: 'job-2', title: 'QA' },
    ];
    mockQb.getManyAndCount.mockResolvedValue([jobs, 2]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          jobs,
          pagination: expect.objectContaining({ total: 2 }),
        }),
      })
    );
  });

  it('returns empty for user with no jobs', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);

    const req = createMockRequest({
      userId: 'lonely-user',
      parsedQuery: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobs: [],
          pagination: expect.objectContaining({ total: 0, totalPages: 0 }),
        }),
      })
    );
  });

  it('applies status filter correctly', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: { page: 1, limit: 10, status: 'active', sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(mockQb.andWhere).toHaveBeenCalledWith('job.status = :status', { status: 'active' });
  });

  it('applies persona filter correctly', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: {
        page: 1,
        limit: 10,
        persona: 'engineer',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(mockQb.andWhere).toHaveBeenCalledWith('job.persona = :persona', { persona: 'engineer' });
  });

  it('applies search filter correctly', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: { page: 1, limit: 10, search: 'react', sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('job.title LIKE :search'),
      { search: '%react%' }
    );
  });

  it('calculates pagination correctly', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 25]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: { page: 2, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(mockQb.skip).toHaveBeenCalledWith(10);
    expect(mockQb.take).toHaveBeenCalledWith(10);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pagination: expect.objectContaining({
            hasNextPage: true,
            hasPrevPage: true,
            totalPages: 3,
          }),
        }),
      })
    );
  });

  it('isolates user jobs (no cross-user data leak)', async () => {
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);

    const req = createMockRequest({
      userId: 'user-1',
      parsedQuery: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    await JobController.get(req as AuthenticatedRequest, res as unknown as Response);

    expect(mockQb.where).toHaveBeenCalledWith('user.id = :userId', { userId: 'user-1' });
  });
});
