/**
 * Dashboard status metrics row.
 * Displays five equal-width cards, one per job status, with counts and weekly deltas.
 * Click is optional — when `onStatusClick` is omitted the cards are rendered as divs.
 */

import styles from './dashboard-status-metrics.module.css';

export type JobStatus = 'draft' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface DashboardStatusMetric {
  status: JobStatus;
  count: number;
  deltaThisWeek: number;
}

export interface DashboardStatusMetricsData {
  total: number;
  byStatus: DashboardStatusMetric[];
}

export interface DashboardStatusMetricsProps {
  metrics: DashboardStatusMetricsData;
  onStatusClick?: (status: JobStatus) => void;
}

const STATUS_ORDER: JobStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const DashboardStatusMetrics = ({ metrics, onStatusClick }: DashboardStatusMetricsProps) => {
  const statusMap = new Map(metrics.byStatus.map((item) => [item.status, item]));

  return (
    <div className={styles.row}>
      {STATUS_ORDER.map((status) => {
        const item = statusMap.get(status);
        const count = item?.count ?? 0;
        const delta = item?.deltaThisWeek ?? 0;

        const inner = (
          <>
            <span className={`${styles.count} ${styles[status]}`}>{count}</span>
            <span className={styles.label}>{STATUS_LABELS[status]}</span>
            <span className={`${styles.delta} ${styles[status]}`}>
              {delta >= 0 ? `+${delta}` : delta} this week
            </span>
          </>
        );

        if (onStatusClick) {
          return (
            <button
              key={status}
              type="button"
              className={styles.card}
              onClick={() => onStatusClick(status)}
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={status} className={styles.cardStatic}>
            {inner}
          </div>
        );
      })}
    </div>
  );
};
