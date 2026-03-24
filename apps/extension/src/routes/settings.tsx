import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { AiProvidersSection } from '../components/AiProvidersSection';
import styles from './style/settings.module.css';
import { PersonasSection } from '../components/PersonasSection';

export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

function SettingsComponent() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate({ to: '/' })}
          aria-label="Go back"
        >
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
