/**
 * Onboarding accordion container.
 * Renders the four step cards and keeps exactly one incomplete step expanded at a time.
 */

import { useEffect, useState } from 'react';
import type { OnboardingStep, OnboardingStepKey } from '@repo/shared-types';
import { OnboardingStepCard } from './onboarding-step-card.tsx';
import {
  Step1AiProviderBody,
  Step2PersonaResumeBody,
  Step3FirstJobBody,
  Step4EventOrTagBody,
} from './onboarding-step-bodies.tsx';
import styles from './style/onboarding-accordion.module.css';

interface OnboardingAccordionProps {
  steps: OnboardingStep[];
  isLocallyComplete: (key: OnboardingStepKey) => boolean;
  onSkip: (key: OnboardingStepKey) => void;
}

const STEP_ORDER: OnboardingStepKey[] = [
  'aiProvider',
  'personaAndResume',
  'firstJob',
  'eventOrTag',
];

export const OnboardingAccordion = ({
  steps,
  isLocallyComplete,
  onSkip,
}: OnboardingAccordionProps) => {
  const [expandedKey, setExpandedKey] = useState<OnboardingStepKey | null>(null);

  useEffect(() => {
    const effectiveComplete = (key: OnboardingStepKey) => {
      const step = steps.find((s) => s.key === key);
      return step?.isComplete === true || isLocallyComplete(key);
    };

    if (expandedKey === null || effectiveComplete(expandedKey)) {
      const nextKey = STEP_ORDER.find((key) => !effectiveComplete(key)) ?? null;
      setExpandedKey(nextKey);
    }
  }, [steps, isLocallyComplete, expandedKey]);

  const handleToggle = (key: OnboardingStepKey) => {
    setExpandedKey((current) => (current === key ? null : key));
  };

  const stepMap = new Map(steps.map((step) => [step.key, step]));

  return (
    <div className={styles.accordion}>
      {STEP_ORDER.map((key, index) => {
        const step = stepMap.get(key);
        if (!step) return null;

        return (
          <OnboardingStepCard
            key={key}
            step={step}
            stepNumber={index + 1}
            isExpanded={expandedKey === key}
            onToggle={() => handleToggle(key)}
          >
            {getStepBody(key, isLocallyComplete(key), () => onSkip(key))}
          </OnboardingStepCard>
        );
      })}
    </div>
  );
};

function getStepBody(key: OnboardingStepKey, isSkipped: boolean, onSkip: () => void) {
  switch (key) {
    case 'aiProvider':
      return <Step1AiProviderBody />;
    case 'personaAndResume':
      return <Step2PersonaResumeBody />;
    case 'firstJob':
      return <Step3FirstJobBody />;
    case 'eventOrTag':
      return <Step4EventOrTagBody onSkip={isSkipped ? undefined : onSkip} />;
  }
}
