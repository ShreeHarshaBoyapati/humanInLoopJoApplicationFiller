import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { ProvidersListSection } from '../components/providers-list-section';
import styles from './style/settings.module.css';
import type { UserPublic } from '@repo/shared-types';

export interface SettingsSearch {
  returnTo?: string;
  jobId?: string;
  step?: number;
  mode?: 'autofill' | 'update';
}

type UserResponse = { success: true; data: UserPublic } | { success: false; error: string };

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    return {
      returnTo: search.returnTo as string | undefined,
      jobId: search.jobId as string | undefined,
      step: search.step ? Number(search.step) : undefined,
    };
  },
  loader: async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return { user: null };
    }

    return new Promise<{ user: UserPublic | null }>((resolve) => {
      chrome.runtime.sendMessage({ action: 'GET_CURRENT_USER' }, (res: unknown) => {
        const response = res as UserResponse;
        if (response?.success && response.data) {
          resolve({ user: response.data });
        } else {
          resolve({ user: null });
        }
      });
    });
  },
  component: SettingsComponent,
});

function SettingsComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = Route.useLoaderData();

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
          <AccountCircleIcon fontSize="large" />
          <div className={styles.aiStatusLabels}>
            {user ? (
              <span className={`${styles.aiStatusValue} ${styles.emailValue}`}>{user.email}</span>
            ) : (
              <span className={styles.aiStatusValue}>Not signed in</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Providers Section */}
      <ProvidersListSection />
    </div>
  );
}
