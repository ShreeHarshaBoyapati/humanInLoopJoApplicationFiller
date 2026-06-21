/**
 * React Query hook for the full dashboard summary.
 * Fetches fresh dashboard data every time the component mounts and whenever
 * the selected funnel range changes.
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../services/dashboard-api.ts';
import type { DashboardRange, DashboardResponse } from '@repo/shared-types';

export interface UseDashboardOptions {
  range: DashboardRange;
  topAtsLimit?: number;
  eventsLimit?: number;
}

export const DASHBOARD_KEYS = {
  all: ['dashboard', 'summary'] as const,
  byRange: (range: DashboardRange) => [...DASHBOARD_KEYS.all, range] as const,
};

export const useDashboard = ({ range, topAtsLimit, eventsLimit }: UseDashboardOptions) => {
  return useQuery<DashboardResponse>({
    queryKey: DASHBOARD_KEYS.byRange(range),
    queryFn: () => getDashboard({ range, topAtsLimit, eventsLimit }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};
