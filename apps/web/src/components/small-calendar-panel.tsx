import { useMemo, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Calendar } from 'react-calendar';
import type { TileArgs } from 'react-calendar';
import { useEventDots } from '../hooks/use-events';
import { EventsHeaderRow } from './events-header-row';
import { JobCalendarEventsList } from './job-calendar-events-list';
import { AddEventModal } from './add-event-modal';
import type { Job } from '@repo/shared-types';
import styles from './style/small-calendar-panel.module.css';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

interface SmallCalendarPanelProps {
  job: Job;
}

export function SmallCalendarPanel({ job }: SmallCalendarPanelProps) {
  const [activeStartDate, setActiveStartDate] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(toYmd(new Date()));
  const [isAddOpen, setIsAddOpen] = useState(false);

  const from = useMemo(() => toYmd(activeStartDate), [activeStartDate]);
  const to = useMemo(() => toYmd(endOfMonth(activeStartDate)), [activeStartDate]);

  const { data: dotsData } = useEventDots({ mode: 'dots', from, to, jobId: job.id });

  const itemsByDate = useMemo(() => {
    const map = new Map<string, Array<{ color: string }>>();
    (dotsData?.dates ?? []).forEach(({ date, tagColor }) => {
      const items = tagColor.map((color) => ({ color }));
      map.set(date, items);
    });
    return map;
  }, [dotsData]);

  return (
    <div className={styles.container}>
      <div className={styles.calendarWrapper}>
        <Calendar
          activeStartDate={activeStartDate}
          onActiveStartDateChange={({ activeStartDate: next }) => {
            if (next instanceof Date) setActiveStartDate(next);
          }}
          value={selectedDate ? new Date(selectedDate) : new Date()}
          onChange={(value) => {
            if (value instanceof Date) setSelectedDate(toYmd(value));
          }}
          prevLabel={<ChevronLeftIcon sx={{ fontSize: '1.25rem' }} />}
          nextLabel={<ChevronRightIcon sx={{ fontSize: '1.25rem' }} />}
          next2Label={null}
          prev2Label={null}
          showFixedNumberOfWeeks
          tileClassName={({ date, view }: TileArgs): string | null => {
            if (view !== 'month') return null;
            const ymd = toYmd(date);
            return itemsByDate.has(ymd) ? 'hasEvents' : null;
          }}
          tileContent={({ date, view }) => {
            if (view !== 'month') return null;
            const ymd = toYmd(date);
            const items = itemsByDate.get(ymd) ?? [];
            if (items.length === 0) return null;
            return (
              <div className={styles.dotRow}>
                {items.slice(0, 2).map((item, idx) => (
                  <span key={idx} className={styles.dot} style={{ backgroundColor: item.color }} />
                ))}
                {items.length > 2 && (
                  <span className={styles.dotOverflow}>+{items.length - 2}</span>
                )}
              </div>
            );
          }}
        />
      </div>

      <div className={styles.eventsSection}>
        <EventsHeaderRow onAddClick={() => setIsAddOpen(true)} />
        <JobCalendarEventsList
          params={{ mode: 'list', jobId: job.id, from: selectedDate, to: selectedDate }}
          selectedDate={selectedDate}
        />
      </div>

      <AddEventModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialDate={selectedDate}
        initialJob={job}
      />
    </div>
  );
}

export default SmallCalendarPanel;
