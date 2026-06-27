import type { ResultDetail } from '@repo/shared-types';
import styles from './style/result-detail-view.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';

interface ResultDetailViewProps {
  result: ResultDetail | null;
  isLoading: boolean;
  error?: string | null;
}

const scoreClass = (score: number) => {
  if (score >= 70) return styles.scoreHigh;
  if (score >= 40) return styles.scoreMid;
  return styles.scoreLow;
};

const scoreBarColor = (score: number) => {
  if (score >= 70) return styleConstants.green400;
  if (score >= 40) return styleConstants.yellow400;
  return styleConstants.red600;
};

export const ResultDetailView = ({ result, isLoading, error }: ResultDetailViewProps) => {
  if (isLoading) {
    return (
      <div className={`${styles.wrapper} ${scrollbarStyles.scrollbarVerticalContainer}`}>
        {/* Score skeleton */}
        <div className={`${styles.skeleton} ${styles.skeletonScore}`} />
        {/* Verdict skeleton */}
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        {/* Tag skeletons */}
        <div className={styles.section}>
          <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
          <div style={{ display: 'flex', gap: 'calc(var(--spacing) * 2)' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ height: 24, width: 72, borderRadius: 999 }}
              />
            ))}
          </div>
        </div>
        {/* Suggestions skeleton */}
        <div className={styles.section}>
          <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
          {[1, 2].map((i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonLine}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.wrapper} ${scrollbarStyles.scrollbarVerticalContainer}`}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={`${styles.wrapper} ${scrollbarStyles.scrollbarVerticalContainer}`}>
      {/* Score Card */}
      <div className={styles.scoreCard}>
        <span className={styles.scoreLabel}>ATS Match Score</span>
        <span className={`${styles.scoreNumber} ${scoreClass(result.score)}`}>
          {result.score}
          <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>/100</span>
        </span>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreBarFill}
            style={{ width: `${result.score}%`, background: scoreBarColor(result.score) }}
          />
        </div>
      </div>

      {/* Overall Verdict */}
      {result.breakdown.overallVerdict && (
        <p className={styles.verdict}>{result.breakdown.overallVerdict}</p>
      )}

      {/* Highly Matched Keywords */}
      {result.breakdown.highlyMatchedKeys.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>✓ Highly Matched</h4>
          <div className={styles.tagList}>
            {result.breakdown.highlyMatchedKeys.map((key) => (
              <span key={key} className={`${styles.tag} ${styles.tagGreen}`}>
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {result.breakdown.missingFields.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>✗ Missing / Weak</h4>
          <div className={styles.tagList}>
            {result.breakdown.missingFields.map((key) => (
              <span key={key} className={`${styles.tag} ${styles.tagRed}`}>
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {result.breakdown.suggestions.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>💡 Suggestions</h4>
          <div className={styles.suggestions}>
            {result.breakdown.suggestions.map((tip, i) => (
              <div key={i} className={styles.suggestion}>
                <span className={styles.suggestionIndex}>{i + 1}</span>
                <span className={styles.suggestionText}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
