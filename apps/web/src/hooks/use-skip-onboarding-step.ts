import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OnboardingStepKey } from '@repo/shared-types';
import { completeOnboarding } from '../services/dashboard-api.ts';
import { ONBOARDING_KEYS } from './use-onboarding.ts';

export const useSkipOnboardingStep = () => {
  const queryClient = useQueryClient();
  const [skippedSteps, setSkippedSteps] = useState<Set<OnboardingStepKey>>(new Set());

  const isSkipped = useCallback((key: OnboardingStepKey) => skippedSteps.has(key), [skippedSteps]);

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      setSkippedSteps((prev) => new Set(prev).add('eventOrTag'));
      queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
    },
  });

  const skipStep = useCallback(
    (key: OnboardingStepKey) => {
      setSkippedSteps((prev) => new Set(prev).add(key));
      mutation.mutate();
    },
    [mutation]
  );

  return { skippedSteps, skipStep, isSkipped, isSubmitting: mutation.isPending };
};
