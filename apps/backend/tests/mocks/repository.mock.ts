import { vi } from 'vitest';

export const createMockRepository = () => ({
  findOne: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  createQueryBuilder: vi.fn(),
});

export const createMockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  take: vi.fn().mockReturnThis(),
  getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
});
