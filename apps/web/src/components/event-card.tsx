import { useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Event, Job, Tag } from '@repo/shared-types';
import { useUpdateEvent, useDeleteEvent } from '../hooks/use-events';
import { useStore } from '../store';
import { useJobs } from '../hooks/use-jobs';
import { useTags } from '../hooks/use-tags';
import { ConfirmModal } from './confirm-modal';
import { AddEventModal } from './add-event-modal';
import { formatDateDDMMYYYY } from '../utils/date';
import styles from './style/event-card.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedCheckbox, EnhancedTooltipWithText } from '@repo/ui';
import Markdown from '@repo/ui/markdown.jsx';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const showSnackbar = useStore((state) => state.showSnackbar);

  const { data: jobsPages } = useJobs({ limit: 50, searchQuery: '' });
  const jobs = jobsPages?.pages.flatMap((p) => p.items) ?? [];
  const job: Job | undefined = event.jobId ? jobs.find((j) => j.id === event.jobId) : undefined;

  const { data: tagsData } = useTags({ limit: 200 });
  const tag: Tag | undefined = event.tagId
    ? tagsData?.tags.find((t) => t.id === event.tagId)
    : undefined;

  const handleToggleComplete = () => {
    updateEvent.mutate(
      { id: event.id, isCompleted: !event.isCompleted },
      {
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to update event', {
            severity: 'error',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteEvent.mutate(
      { id: event.id },
      {
        onSuccess: () => {
          showSnackbar('Event deleted', { severity: 'success' });
          setIsDeleteOpen(false);
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to delete event', {
            severity: 'error',
          });
        },
      }
    );
  };

  const jobLine = job ? `${job.title}${job.companyName ? ` @ ${job.companyName}` : ''}` : 'No job';
  const timeLine = event.time ? event.time : 'All day';
  const radioTooltip = event.isCompleted
    ? 'Click to mark as incomplete'
    : 'Click to mark as completed';

  return (
    <div className={`${styles.card} ${event.isCompleted ? styles.cardCompleted : ''}`}>
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <EnhancedCheckbox
            checked={event.isCompleted}
            onChange={handleToggleComplete}
            disabled={updateEvent.isPending}
          />
        </EnhancedTooltipWithText>
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span
            className={`${styles.titleText} ${event.isCompleted ? styles.titleTextCompleted : ''}`}
            title={jobLine}
          >
            {jobLine}
          </span>
          {tag && (
            <span
              className={`${styles.tagChip} ${event.isCompleted ? styles.tagChipCompleted : ''}`}
              style={{ backgroundColor: event.isCompleted ? undefined : tag.color }}
            >
              {tag.name}
            </span>
          )}
        </div>
        <span className={`${styles.metaLine} ${event.isCompleted ? styles.metaLineCompleted : ''}`}>
          {timeLine}
        </span>
        <span className={`${styles.metaLine} ${event.isCompleted ? styles.metaLineCompleted : ''}`}>
          {formatDateDDMMYYYY(event.date)}
        </span>
        {event.description && event.description.trim() && (
          <div
            className={`${styles.descriptionWrapper} ${scrollStyles.scrollbarVerticalContainer} ${event.isCompleted ? styles.descriptionWrapperCompleted : ''}`}
          >
            <Markdown source={event.description} />
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setIsEditOpen(true)}
          aria-label="Edit event"
        >
          <EditIcon sx={{ fontSize: '1rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.delete}`}
          onClick={() => setIsDeleteOpen(true)}
          aria-label="Delete event"
        >
          <DeleteIcon sx={{ fontSize: '1rem' }} />
        </button>
      </div>

      <AddEventModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        eventToEdit={event}
        initialJob={job ?? null}
        initialDate={event.date}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteEvent.isPending}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleteEvent.isPending) setIsDeleteOpen(false);
        }}
      />
    </div>
  );
}

export default EventCard;
