import { useMemo } from 'react';
import { useEvents, type UseEventsListParams } from '../hooks/use-events';
import { EventCard } from './event-card';
import { StatusEventCard } from './status-event-card';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import styles from './style/events-list.module.css';

interface JobCalendarEventsListProps {
  params: UseEventsListParams;
  selectedDate: string;
}

export function JobCalendarEventsList({ params, selectedDate }: JobCalendarEventsListProps) {
  const { events, statusPseudoEvents, isLoading } = useEvents(params);

  const statusItemsForDate = useMemo(() => {
    return (statusPseudoEvents ?? []).filter((sp) => sp.date === selectedDate);
  }, [statusPseudoEvents, selectedDate]);

  if (isLoading) {
    return <span className={styles.loadingText}>Loading events...</span>;
  }

  if (events.length === 0 && statusItemsForDate.length === 0) {
    return <span className={styles.emptyText}>No events for this day.</span>;
  }

  return (
    <div className={`${styles.container} ${scrollStyles.scrollbarVerticalContainer}`}>
      {statusItemsForDate.map((sp) => (
        <StatusEventCard key={`status-${sp.status}-${sp.date}`} statusEvent={sp} />
      ))}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export default JobCalendarEventsList;
