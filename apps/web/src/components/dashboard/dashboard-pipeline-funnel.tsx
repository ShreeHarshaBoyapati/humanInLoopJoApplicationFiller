/**
 * Pipeline funnel widget.
 * Shows a horizontal bar chart of job statuses with drop-off annotations,
 * a time range selector, and two bottom insight cards.
 */

import { EnhancedSelectDropdown } from '@repo/ui';
import type { DashboardFunnel, DashboardRange } from '@repo/shared-types';
import type { JobStatus } from '@repo/shared-types';
import { DashboardEmptyState } from './dashboard-empty-state.tsx';
import styles from './style/dashboard-pipeline-funnel.module.css';

interface DashboardPipelineFunnelProps {
  funnel: DashboardFunnel;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'threeMonths', label: 'Last 3 months' },
  { value: 'all', label: 'All time' },
];

const STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'var(--blue-500)',
  applied: 'var(--blue-400)',
  interview: 'var(--yellow-400)',
  offer: 'var(--green-400)',
  rejected: 'var(--red-600)',
};

export const DashboardPipelineFunnel = ({
  funnel,
  range,
  onRangeChange,
}: DashboardPipelineFunnelProps) => {
  const hasData = funnel.stages.length > 0 && funnel.stages.some((stage) => stage.count > 0);

  if (!hasData) {
    return (
      <div className={styles.card}>
        <DashboardEmptyState
          message="No jobs in the selected range. Add jobs to see your pipeline funnel."
          ctaLabel="Go to Job Tracker"
          onCtaClick={() => {}}
        />
      </div>
    );
  }

  const biggestDropoffKey = funnel.biggestDropoff
    ? `${funnel.biggestDropoff.from}-${funnel.biggestDropoff.to}`
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Pipeline funnel</h2>
        <div className={styles.rangeSelector}>
          <EnhancedSelectDropdown
            testId="funnel-range-selector"
            value={range}
            options={RANGE_OPTIONS}
            onChange={(e) => onRangeChange(e.target.value as DashboardRange)}
          />
        </div>
      </div>

      <div className={styles.chart}>
        {funnel.stages.map((stage, index) => {
          const displayPercent = Math.min(stage.percent, 100);
          const prevStage = index > 0 ? funnel.stages[index - 1] : null;
          const dropoff = stage.dropoffFromPrevPercent;

          return (
            <div key={stage.status}>
              {prevStage && dropoff !== null && (
                <div
                  className={`${styles.dropoff} ${
                    isBiggestDropoff(biggestDropoffKey, stage.status) ? styles.dropoffHighlight : ''
                  }`}
                >
                  {dropoff > 0 ? '↓' : '↑'} {Math.abs(dropoff)}% {dropoff > 0 ? 'drop' : 'increase'}{' '}
                  from {prevStage.status}
                </div>
              )}

              <div className={styles.row}>
                <span className={styles.label}>{stage.status}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={
                      {
                        '--funnel-bar-width': `${displayPercent}`,
                        '--funnel-bar-color': STATUS_COLORS[stage.status],
                      } as React.CSSProperties
                    }
                  >
                    <span className={styles.barText}>{stage.count}</span>
                  </div>
                </div>
                <span className={styles.percent}>{displayPercent}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.insights}>
        <div className={styles.insightCard}>
          <span className={styles.insightTitle}>Biggest drop-off</span>
          {funnel.biggestDropoff ? (
            <>
              <span className={styles.insightValue}>
                {funnel.biggestDropoff.from} → {funnel.biggestDropoff.to}
              </span>
              <p className={styles.insightNote}>
                You lose {funnel.biggestDropoff.percent}% of jobs between these stages. Focus here
                to improve conversion.
              </p>
            </>
          ) : (
            <p className={styles.insightNote}>No drop-off data yet.</p>
          )}
        </div>
        <div className={styles.insightCard}>
          <span className={styles.insightTitle}>Overall success rate</span>
          <span className={styles.insightValue}>{funnel.overallSuccessRate.percent}%</span>
          <p className={styles.insightNote}>
            {funnel.overallSuccessRate.offers} offers out of {funnel.overallSuccessRate.bookmarked}{' '}
            bookmarked jobs.
          </p>
        </div>
      </div>
    </div>
  );
};

function isBiggestDropoff(biggestDropoffKey: string | null, stageStatus: JobStatus): boolean {
  if (!biggestDropoffKey) return false;
  return biggestDropoffKey.endsWith(`-${stageStatus}`);
}
