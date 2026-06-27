import styles from './style/analysis-skeleton.module.css';

export function AnalysisSkeleton() {
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
