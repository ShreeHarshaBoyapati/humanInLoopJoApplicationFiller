/**
 * Top ATS matches widget.
 * Lists the highest-scoring bookmarked jobs with a single-line result-card style row.
 */

import type { DashboardTopAtsMatch } from '@repo/shared-types';
import { DashboardEmptyState } from './dashboard-empty-state.tsx';
import styles from './style/dashboard-top-ats-matches.module.css';

interface DashboardTopAtsMatchesProps {
  matches: DashboardTopAtsMatch[];
  onJobClick: (jobId: string) => void;
}

const scoreClass = (score: number) => {
  if (score >= 70) return styles.scoreHigh;
  if (score >= 40) return styles.scoreMid;
  return styles.scoreLow;
};

export const DashboardTopAtsMatches = ({ matches, onJobClick }: DashboardTopAtsMatchesProps) => {
  if (matches.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Top ATS matches</span>
          <span className={styles.subtitle}>for bookmarked jobs</span>
        </div>
        <DashboardEmptyState
          message="No ATS scores yet. Save a job and run an ATS check to see matches here."
          ctaLabel="Go to Job Tracker"
          onCtaClick={() => onJobClick('')}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Top ATS matches</span>
        <span className={styles.subtitle}>for bookmarked jobs</span>
      </div>
      <div className={styles.list}>
        {matches.map((match) => (
          <button
            key={match.jobId}
            type="button"
            className={styles.row}
            onClick={() => onJobClick(match.jobId)}
          >
            <div className={styles.dataSection}>
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.jobTitle}>{match.title}</span>
                  <span className={styles.separator}>-</span>
                  <span className={styles.company}>{match.companyName}</span>
                  <span className={styles.personaName}>({match.personaName})</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.scoredText}>scored</span>
                  <span className={`${styles.scoreValue} ${scoreClass(match.score)}`}>
                    {match.score}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
