import { useEffect, useMemo, useRef } from 'react';
import { useEvents, type UseEventsListParams } from '../hooks/use-events';
import { EventCard } from './event-card';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import styles from './style/events-list.module.css';

interface EventsListProps {
  params: UseEventsListParams;
  emptyMessage?: string;
}

export function EventsList({ params, emptyMessage = 'No events for this day.' }: EventsListProps) {
  const { events, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useEvents(params);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isError) {
          fetchNextPage();
        }
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isError]);

  const sortedEvents = useMemo(() => events, [events]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${scrollStyles.scrollbarVerticalContainer}`}
    >
      {isLoading ? (
        <span className={styles.loadingText}>Loading events...</span>
      ) : sortedEvents.length === 0 ? (
        <span className={styles.emptyText}>{emptyMessage}</span>
      ) : (
        sortedEvents.map((event) => <EventCard key={event.id} event={event} />)
      )}
      {hasNextPage && <div ref={sentinelRef} className={styles.sentinel} />}
      {isFetchingNextPage && <span className={styles.loadingText}>Loading more...</span>}
    </div>
  );
}

export default EventsList;
