/**
 * React Query hook for the dashboard onboarding state.
 * Fetches fresh onboarding progress every time the component mounts.
 */

import { useQuery } from '@tanstack/react-query';
import { getOnboarding } from '../services/dashboard-api.ts';
import type { OnboardingResponse } from '@repo/shared-types';

export const ONBOARDING_KEYS = {
  all: ['dashboard', 'onboarding'] as const,
};

export const useOnboarding = () => {
  return useQuery<OnboardingResponse>({
    queryKey: ONBOARDING_KEYS.all,
    queryFn: getOnboarding,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};
