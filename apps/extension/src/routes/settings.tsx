import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { AiProvidersSection } from '../components/ai-providers-section';
import styles from './style/settings.module.css';
import { PersonasSection } from '../components/personas-section';

export interface SettingsSearch {
  returnTo?: string;
  jobId?: string;
  step?: number;
  mode?: 'autofill' | 'update';
}

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    return {
      returnTo: search.returnTo as string | undefined,
      jobId: search.jobId as string | undefined,
      step: search.step ? Number(search.step) : undefined,
    };
  },
  component: SettingsComponent,
});

function SettingsComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const handleBack = () => {
    if (search.returnTo) {
      navigate({
        to: search.returnTo,
        search: { jobId: search.jobId, step: search.step } as Record<string, unknown>,
      });
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="Go back">
          <ArrowBackIcon />
        </button>
        <h1 className={styles.headerTitle}>Settings</h1>
      </div>

      {/* Account Details */}
      <div className={styles.aiStatusArea}>
        <h3 className={styles.sectionHeading}>ACCOUNT DETAILS</h3>
        <div className={styles.aiStatusCard}>
          <div className={styles.aiStatusLabels}>
            <span className={styles.aiStatusTitle}>Alex Rivers</span>
            <span className={styles.aiStatusValue}>alex.rivers@vitest.dev</span>
          </div>
        </div>
      </div>

      <PersonasSection />

      {/* AI Providers Section */}
      <AiProvidersSection />
    </div>
  );
}
