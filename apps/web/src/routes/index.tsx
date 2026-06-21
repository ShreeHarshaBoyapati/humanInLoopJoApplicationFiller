import { createFileRoute } from '@tanstack/react-router';
import { useOnboarding } from '../hooks/use-onboarding.ts';
import { OnboardingView } from '../components/dashboard/onboarding/onboarding-view.tsx';
import { DashboardView } from '../components/dashboard/dashboard-view.tsx';
import styles from './style/dashboard.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import '@repo/ui/constants/css-constants.css';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { data: onboarding, isLoading } = useOnboarding();

  return (
    <div className={`${styles.container} ${scrollbarStyles.scrollbarVerticalContainer}`}>
      {isLoading ? (
        <div
          className={styles.card}
          style={{ color: styleConstants.white700, textAlign: 'center' }}
        >
          Loading dashboard…
        </div>
      ) : !onboarding?.isComplete ? (
        <OnboardingView />
      ) : (
        <DashboardView />
      )}
    </div>
  );
}
