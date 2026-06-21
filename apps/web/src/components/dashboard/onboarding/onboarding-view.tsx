/**
 * Onboarding view orchestrator.
 * Displays the four-step onboarding checklist for new users and switches to the
 * completion banner once every step is marked complete.
 */

import { useOnboarding } from '../../../hooks/use-onboarding.ts';
import { useSkipOnboardingStep } from '../../../hooks/use-skip-onboarding-step.ts';
import { useStore } from '../../../store/index.ts';
import { getDisplayName } from '../../../utils/dashboard.ts';
import { OnboardingGreeting } from './onboarding-greeting.tsx';
import { OnboardingProgressCard } from './onboarding-progress-card.tsx';
import { OnboardingAccordion } from './onboarding-accordion.tsx';
import { OnboardingCompletionBanner } from './onboarding-completion-banner.tsx';
import sharedStyles from '../style/onboarding.module.css';

export const OnboardingView = () => {
  const email = useStore((state) => state.email);
  const displayName = getDisplayName(email);
  const { data: onboarding, isLoading } = useOnboarding();
  const { isSkipped, skipStep } = useSkipOnboardingStep();

  if (isLoading || !onboarding) {
    return (
      <div className={sharedStyles.page}>
        <OnboardingGreeting displayName={displayName} />
        <div className={sharedStyles.card}>Loading onboarding checklist…</div>
      </div>
    );
  }

  const effectiveSteps = onboarding.steps.map((step) => ({
    ...step,
    isComplete: step.isComplete || isSkipped(step.key),
  }));

  const completedSteps = effectiveSteps.filter((step) => step.isComplete).length;
  const isComplete = completedSteps === effectiveSteps.length;

  return (
    <div className={sharedStyles.page}>
      <OnboardingGreeting displayName={displayName} />
      <OnboardingProgressCard completedSteps={completedSteps} totalSteps={effectiveSteps.length} />
      <OnboardingAccordion steps={effectiveSteps} isLocallyComplete={isSkipped} onSkip={skipStep} />
      {isComplete && <OnboardingCompletionBanner />}
    </div>
  );
};
