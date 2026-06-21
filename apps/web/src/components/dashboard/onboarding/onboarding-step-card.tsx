/**
 * Single onboarding accordion step card.
 * Displays the step number, title, severity, description, and expandable body.
 */

import type { ReactNode } from 'react';
import { Check } from '@mui/icons-material';
import type { OnboardingStep } from '@repo/shared-types';
import { OnboardingSeverityBadge } from './onboarding-severity-badge.tsx';
import styles from './style/onboarding-step-card.module.css';

interface OnboardingStepCardProps {
  step: OnboardingStep;
  stepNumber: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export const OnboardingStepCard = ({
  step,
  stepNumber,
  isExpanded,
  onToggle,
  children,
}: OnboardingStepCardProps) => {
  return (
    <div className={`${styles.card} ${step.isComplete ? styles.completed : ''}`}>
      <button type="button" className={styles.header} onClick={onToggle} aria-expanded={isExpanded}>
        <div className={`${styles.circle} ${step.isComplete ? styles.completed : ''}`}>
          {step.isComplete ? <Check className={styles.checkIcon} /> : stepNumber}
        </div>
        <div className={styles.titleColumn}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{getStepTitle(step.key)}</span>
            <OnboardingSeverityBadge severity={step.severity} />
          </div>
          <p className={styles.description}>{getStepDescription(step.key)}</p>
        </div>
      </button>

      {isExpanded && <div className={styles.body}>{children}</div>}
    </div>
  );
};

const STEP_TITLES: Record<OnboardingStep['key'], string> = {
  aiProvider: 'Configure your AI provider',
  personaAndResume: 'Create a persona and add a resume',
  firstJob: 'Add your first job',
  eventOrTag: 'Add an event or tag a job',
};

const STEP_DESCRIPTIONS: Record<OnboardingStep['key'], string> = {
  aiProvider: 'Add an API key to enable resume parsing and ATS scoring.',
  personaAndResume: 'Create a persona and upload a resume so ATS matching can work.',
  firstJob: 'Save a job from a listing page to populate your pipeline.',
  eventOrTag: 'Add events or tags to organize your job search and calendar.',
};

function getStepTitle(key: OnboardingStep['key']): string {
  return STEP_TITLES[key];
}

function getStepDescription(key: OnboardingStep['key']): string {
  return STEP_DESCRIPTIONS[key];
}
