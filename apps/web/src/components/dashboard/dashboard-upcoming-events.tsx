/**
 * Upcoming events widget.
 * Lists the next calendar events across all jobs with a colored type bar and a tag.
 */

import type { DashboardUpcomingEvent } from '@repo/shared-types';
import { DashboardEmptyState } from './dashboard-empty-state.tsx';
import styles from './style/dashboard-upcoming-events.module.css';

interface DashboardUpcomingEventsProps {
  events: DashboardUpcomingEvent[];
  onJobClick: (jobId: string) => void;
  onTaskClick: (date: string) => void;
}

export const DashboardUpcomingEvents = ({
  events,
  onJobClick,
  onTaskClick,
}: DashboardUpcomingEventsProps) => {
  if (events.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Upcoming events</span>
          <span className={styles.subtitle}>next 5</span>
        </div>
        <DashboardEmptyState
          message="No upcoming events. Add one in the Job Tracker to keep your schedule on track."
          ctaLabel="Go to Job Tracker"
          onCtaClick={() => onTaskClick('')}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Upcoming events</span>
        <span className={styles.subtitle}>next 5</span>
      </div>
      <div className={styles.list}>
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className={styles.row}
            onClick={() => (event.jobId ? onJobClick(event.jobId) : onTaskClick(event.date))}
          >
            <div
              className={styles.colorBar}
              style={{ '--event-color': event.tagColor } as React.CSSProperties}
            />
            <div className={styles.info}>
              <p className={styles.eventTitle}>
                {event.title}
                {event.jobName && event.companyName && (
                  <span>
                    {' '}
                    · {event.jobName} at {event.companyName}
                  </span>
                )}
              </p>
              <span className={styles.meta}>
                {formatDate(event.date)}
                {event.time && ` at ${event.time}`}
              </span>
            </div>
            <span className={styles.tag}>{event.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
