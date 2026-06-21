/**
 * Persona breakdown widget.
 * Shows how jobs are distributed across personas as horizontal bars.
 */

import type { DashboardPersonaBreakdown as PersonaBreakdownItem } from '@repo/shared-types';
import { DashboardEmptyState } from './dashboard-empty-state.tsx';
import styles from './style/dashboard-persona-breakdown.module.css';

interface DashboardPersonaBreakdownProps {
  breakdown: PersonaBreakdownItem[];
  onPersonaClick: (personaId: string | null) => void;
}

export const DashboardPersonaBreakdown = ({
  breakdown,
  onPersonaClick,
}: DashboardPersonaBreakdownProps) => {
  if (breakdown.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Persona breakdown</span>
          <span className={styles.subtitle}>by jobs added</span>
        </div>
        <DashboardEmptyState
          message="No jobs added yet. Create a persona and add jobs to see the breakdown."
          ctaLabel="Go to Job Tracker"
          onCtaClick={() => onPersonaClick(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Persona breakdown</span>
        <span className={styles.subtitle}>by jobs added</span>
      </div>
      <div className={styles.list}>
        {breakdown.map((persona) => (
          <button
            key={persona.personaId ?? 'unassigned'}
            type="button"
            className={styles.row}
            onClick={() => onPersonaClick(persona.personaId)}
          >
            <div className={styles.rowHeader}>
              <span className={styles.name}>{persona.name}</span>
              <span className={styles.stats}>
                {persona.jobsCount} jobs · {persona.percentage}%
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ '--persona-percent': `${persona.percentage}` } as React.CSSProperties}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
