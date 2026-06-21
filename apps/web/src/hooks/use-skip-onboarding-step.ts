/**
 * Local-only skip helper for the optional onboarding step.
 * The skipped state lives in component state so the checklist can collapse
 * without a backend mutation.
 */

import { useCallback, useState } from 'react';
import type { OnboardingStepKey } from '@repo/shared-types';

export const useSkipOnboardingStep = () => {
  const [skippedSteps, setSkippedSteps] = useState<Set<OnboardingStepKey>>(new Set());

  const skipStep = useCallback((key: OnboardingStepKey) => {
    setSkippedSteps((prev) => new Set(prev).add(key));
  }, []);

  const isSkipped = useCallback((key: OnboardingStepKey) => skippedSteps.has(key), [skippedSteps]);

  return { skippedSteps, skipStep, isSkipped };
};
