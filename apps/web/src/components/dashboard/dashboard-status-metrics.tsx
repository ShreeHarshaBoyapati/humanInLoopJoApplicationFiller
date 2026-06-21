/**
 * Dashboard status metrics row.
 * Displays five equal-width cards, one per job status, with counts and weekly deltas.
 */

import type { DashboardResponse } from '@repo/shared-types';
import type { JobStatus } from '@repo/shared-types';
import { DashboardEmptyState } from './dashboard-empty-state.tsx';
import styles from './style/dashboard-status-metrics.module.css';

interface DashboardStatusMetricsProps {
  metrics: DashboardResponse['metrics'];
  onStatusClick?: (status: JobStatus) => void;
}

const STATUS_ORDER: JobStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Bookmarked',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const DashboardStatusMetrics = ({ metrics, onStatusClick }: DashboardStatusMetricsProps) => {
  const statusMap = new Map(metrics.byStatus.map((item) => [item.status, item]));

  const hasAnyData = metrics.total > 0 || metrics.byStatus.some((item) => item.count > 0);

  if (!hasAnyData) {
    return (
      <div className={styles.row}>
        <DashboardEmptyState
          message="No jobs tracked yet. Add your first job to see status metrics."
          ctaLabel="Go to Job Tracker"
          onCtaClick={() => onStatusClick?.('draft')}
        />
      </div>
    );
  }

  return (
    <div className={styles.row}>
      {STATUS_ORDER.map((status) => {
        const item = statusMap.get(status);
        const count = item?.count ?? 0;
        const delta = item?.deltaThisWeek ?? 0;

        return (
          <button
            key={status}
            type="button"
            className={styles.card}
            onClick={() => onStatusClick?.(status)}
          >
            <span className={`${styles.count} ${styles[status]}`}>{count}</span>
            <span className={styles.label}>{STATUS_LABELS[status]}</span>
            <span className={`${styles.delta} ${styles[status]}`}>
              {delta >= 0 ? `+${delta}` : delta} this week
            </span>
          </button>
        );
      })}
    </div>
  );
};
