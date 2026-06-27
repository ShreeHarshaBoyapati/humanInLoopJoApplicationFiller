/**
 * Upcoming events widget.
 * Lists the next calendar events across all jobs with a colored type bar and a tag.
 * Click is optional — when `onEventClick` is omitted the rows are rendered as divs.
 */

import styles from './dashboard-upcoming-events.module.css';

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  jobName: string | null;
  companyName: string | null;
  date: string;
  time: string | null;
  type: string;
  tagColor: string;
  jobId: string | null;
}

export interface DashboardUpcomingEventsProps {
  events: DashboardUpcomingEvent[];
  onEventClick?: (event: DashboardUpcomingEvent) => void;
}

export const DashboardUpcomingEvents = ({ events, onEventClick }: DashboardUpcomingEventsProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Upcoming events</span>
        <span className={styles.subtitle}>next 5</span>
      </div>

      {events.length === 0 ? (
        <p className={styles.empty}>No upcoming events. Add one in the Job Tracker.</p>
      ) : (
        <div className={styles.list}>
          {events.slice(0, 5).map((event) => {
            const content = (
              <>
                <div
                  className={styles.colorBar}
                  style={{ '--event-color': event.tagColor } as React.CSSProperties}
                />
                <div className={styles.info}>
                  <p className={styles.eventTitle}>
                    {event.title}
                    {event.jobName && event.companyName && (
                      <span>
                        {' · '}
                        {event.jobName} at {event.companyName}
                      </span>
                    )}
                  </p>
                  <span className={styles.meta}>
                    {formatDate(event.date)}
                    {event.time && ` at ${event.time}`}
                  </span>
                </div>
                <span className={styles.tag}>{event.type}</span>
              </>
            );

            if (onEventClick) {
              return (
                <button
                  key={event.id}
                  type="button"
                  className={styles.row}
                  onClick={() => onEventClick(event)}
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={event.id} className={styles.rowStatic}>
                {content}
              </div>
            );
          })}
        </div>
      )}
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
