import { vi } from 'vitest';

export const createMockResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

export const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  body: {},
  params: {},
  query: {},
  cookies: {},
  ...overrides,
});

export const createMockNext = () => vi.fn();
