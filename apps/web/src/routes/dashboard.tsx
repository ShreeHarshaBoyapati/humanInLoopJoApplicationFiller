/**
 * Dashboard route entry point.
 * Wraps the active view in a full-height container so the correct
 * dark surface color fills the viewport, matching the job-tracker route.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useOnboarding } from '../hooks/use-onboarding.ts';
import { OnboardingView } from '../components/dashboard/onboarding/onboarding-view.tsx';
import { DashboardView } from '../components/dashboard/dashboard-view.tsx';
import styles from './style/dashboard.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: onboarding, isLoading } = useOnboarding();

  return (
    <div className={`${styles.container} ${scrollbarStyles.scrollbarVerticalContainer}`}>
      {isLoading ? (
        <div>Loading dashboard…</div>
      ) : !onboarding?.isComplete ? (
        <OnboardingView />
      ) : (
        <DashboardView />
      )}
    </div>
  );
}
