import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { EnhancedButton } from '@repo/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AiProvidersSection } from '../components/AiProvidersSection';
import styles from './style/settings.module.css';

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

      {/* Personas Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>PERSONAS</span>
          <span className={styles.sectionMeta}>3 Total</span>
        </div>

        {/* Active Persona */}
        <div className={`${styles.card} ${styles.activeCard}`}>
          <div className={styles.personaHeader}>
            <div className={styles.personaTitleWrapper}>
              <span className={styles.personaTitle}>Frontend Engineer</span>
              <span className={styles.activeBadgeText}>Active Persona</span>
            </div>
            <CheckCircleOutlineIcon className={styles.checkIcon} />
          </div>
          <p className={styles.personaSnippet}>React, Tailwind, Vitest expert</p>
          <EnhancedButton
            label="View Resumes"
            colorTheme="primary"
            style={{ width: '100%', padding: 'calc(var(--spacing) * 3)' }}
          />
        </div>

        {/* Inactive Persona */}
        <div className={styles.card}>
          <div className={styles.personaHeader}>
            <div className={styles.personaTitleWrapper}>
              <span className={styles.personaTitle}>Backend Developer</span>
            </div>
            <button className={styles.switchBtn}>Switch</button>
          </div>
          <p className={styles.personaSnippet} style={{ marginBottom: 0 }}>
            Node.js, PostgreSQL, Redis
          </p>
        </div>

        <button className={styles.viewMoreBtn}>
          <span>View More</span>
          <ExpandMoreIcon fontSize="small" />
        </button>
      </section>

      {/* AI Providers Section */}
      <AiProvidersSection />
    </div>
  );
}
