import styles from '../routes/style/settings.module.css';
import { EnhancedButton } from '@repo/ui';
import AddIcon from '@mui/icons-material/Add';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';

export function PersonasSection() {
  const [isAddingPersona, setIsAddingProvider] = useState<boolean>(false);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>PERSONAS</span>
        <EnhancedButton
          colorTheme="tertiary"
          size="small"
          label="Add New"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setIsAddingProvider(true)}
        />
      </div>

      {/* Active Persona */}
      <div className={`${styles.card} ${styles.cardPadding} ${styles.activeCard}`}>
        <div className={styles.personaHeader}>
          <div className={styles.personaTitleWrapper}>
            <span className={styles.personaTitle}>Frontend Engineer</span>
          </div>
        </div>
        <p className={styles.personaSnippet}>React, Tailwind, Vitest expert</p>
        <EnhancedButton
          label="View Resumes"
          colorTheme="primary"
          style={{ width: '100%', padding: 'calc(var(--spacing) * 3)' }}
        />
      </div>

      {/* Inactive Persona */}
      <div className={`${styles.card} ${styles.cardPadding}`}>
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
  );
}
