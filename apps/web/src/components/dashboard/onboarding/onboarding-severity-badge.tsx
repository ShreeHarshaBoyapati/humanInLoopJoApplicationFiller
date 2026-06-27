/**
 * Onboarding step severity badge.
 * Renders a small label indicating whether a step is required, recommended, or optional.
 */

import type { OnboardingStepSeverity } from '@repo/shared-types';
import styles from './style/onboarding-severity-badge.module.css';

interface OnboardingSeverityBadgeProps {
  severity: OnboardingStepSeverity;
}

const SEVERITY_LABELS: Record<OnboardingStepSeverity, string> = {
  required: 'Required',
  recommended: 'Recommended',
  optional: 'Optional',
};

const SEVERITY_CLASSES: Record<OnboardingStepSeverity, string> = {
  required: styles.required,
  recommended: styles.recommended,
  optional: styles.optional,
};

export const OnboardingSeverityBadge = ({ severity }: OnboardingSeverityBadgeProps) => {
  return (
    <span className={`${styles.badge} ${SEVERITY_CLASSES[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
};
