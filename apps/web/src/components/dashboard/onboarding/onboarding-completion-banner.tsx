/**
 * Onboarding completion banner.
 * Appears when all four onboarding steps are done and offers a shortcut to the Job Tracker.
 */

import { useNavigate } from '@tanstack/react-router';
import { EnhancedButton } from '@repo/ui';
import styles from './style/onboarding-completion-banner.module.css';

export const OnboardingCompletionBanner = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.banner}>
      <h2 className={styles.heading}>You're all set!</h2>
      <p className={styles.text}>
        Your dashboard is now fully unlocked. Start tracking jobs and running ATS checks.
      </p>
      <div>
        <EnhancedButton
          label="Go to Job Tracker"
          colorTheme="primary"
          onClick={() => navigate({ to: '/job-tracker' })}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
      </div>
    </div>
  );
};
