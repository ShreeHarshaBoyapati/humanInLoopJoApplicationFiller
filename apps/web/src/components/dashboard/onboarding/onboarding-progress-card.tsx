/**
 * Onboarding progress card.
 * Shows how many of the setup steps are complete and a visual progress bar.
 */

import styles from './style/onboarding-progress-card.module.css';

interface OnboardingProgressCardProps {
  completedSteps: number;
  totalSteps: number;
}

export const OnboardingProgressCard = ({
  completedSteps,
  totalSteps,
}: OnboardingProgressCardProps) => {
  const percent = totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Setup progress</span>
        <span className={styles.label}>
          {completedSteps} of {totalSteps} complete
        </span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ '--progress-percent': `${percent}` } as React.CSSProperties}
          aria-valuenow={completedSteps}
          aria-valuemax={totalSteps}
          role="progressbar"
        />
      </div>
      <p className={styles.note}>Complete all steps to unlock the full dashboard</p>
    </div>
  );
};
