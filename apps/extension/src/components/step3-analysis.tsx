import type { AnalysisResult } from '@repo/shared-types';
import styles from '../routes/style/step3-analysis.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';

interface Step3AnalysisProps {
  result: AnalysisResult | null;
  isLoading: boolean;
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

export const Step3Analysis = ({ result, isLoading }: Step3AnalysisProps) => {
  if (isLoading) {
    return (
      <div className={styles.wrapper}>
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

  if (!result) return null;

  return (
    <div className={styles.wrapper}>
      {/* ── Score ── */}
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

      {/* ── Overall Verdict ── */}
      {result.overallVerdict && <p className={styles.verdict}>{result.overallVerdict}</p>}

      {/* ── Highly Matched Keywords ── */}
      {result.highlyMatchedKeys.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>✓ Highly Matched</h4>
          <div className={styles.tagList}>
            {result.highlyMatchedKeys.map((key) => (
              <span key={key} className={`${styles.tag} ${styles.tagGreen}`}>
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Missing Keywords ── */}
      {result.missingFields.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>✗ Missing / Weak</h4>
          <div className={styles.tagList}>
            {result.missingFields.map((key) => (
              <span key={key} className={`${styles.tag} ${styles.tagRed}`}>
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggestions ── */}
      {result.suggestions.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>💡 Suggestions</h4>
          <div className={styles.suggestions}>
            {result.suggestions.map((tip, i) => (
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

export default Step3Analysis;
