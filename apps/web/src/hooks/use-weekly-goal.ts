/**
 * React Query hooks for weekly goal targets and progress.
 * Provides a read hook that always fetches fresh targets and a mutation
 * hook that updates them and invalidates dependent dashboard queries.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWeeklyGoal, updateWeeklyGoal } from '../services/dashboard-api.ts';
import { DASHBOARD_KEYS } from './use-dashboard.ts';
import type { UpdateWeeklyGoalInput, WeeklyGoalResponse } from '@repo/shared-types';

export const WEEKLY_GOAL_KEYS = {
  all: ['dashboard', 'weekly-goal'] as const,
};

export const useWeeklyGoal = () => {
  return useQuery<WeeklyGoalResponse>({
    queryKey: WEEKLY_GOAL_KEYS.all,
    queryFn: getWeeklyGoal,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};

export const useUpdateWeeklyGoal = () => {
  const queryClient = useQueryClient();

  return useMutation<WeeklyGoalResponse, Error, UpdateWeeklyGoalInput>({
    mutationFn: updateWeeklyGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEEKLY_GOAL_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
    },
  });
};
