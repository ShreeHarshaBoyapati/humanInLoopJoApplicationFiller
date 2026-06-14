import { useState, useCallback } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { EnhancedButton, EnhancedTextInputArea } from '@repo/ui';
import type { Job, UpdateJobInput } from '@repo/shared-types';
import { useUpdateJob } from '../hooks/use-jobs';
import { useStore } from '../store';
import styles from './style/job-notes-tab.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import Markdown from './markdown';

interface JobNotesTabProps {
  job: Job;
  onJobUpdate?: (updatedJob: Job) => void;
}

export function JobNotesTab({ job, onJobUpdate }: JobNotesTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(job.notes || '');
  const updateJob = useUpdateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

  const handleEditClick = () => {
    setNotes(job.notes || '');
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setNotes(job.notes || '');
  };

  const handleSaveClick = useCallback(async () => {
    const payload: UpdateJobInput = {
      id: job.id,
      notes: notes || undefined,
    };

    updateJob.mutate(payload, {
      onSuccess: (updatedJob) => {
        showSnackbar('Notes saved successfully!', { severity: 'success' });
        setIsEditing(false);
        if (onJobUpdate && updatedJob) {
          onJobUpdate(updatedJob);
        }
      },
      onError: (error) => {
        showSnackbar(error instanceof Error ? error.message : 'Failed to save notes', {
          severity: 'error',
        });
      },
    });
  }, [notes, job.id, updateJob, showSnackbar, onJobUpdate]);

  const handleChange = (e: { target: { value: unknown } }) => {
    const value = String(e.target.value);
    setNotes(value);
  };

  const isLoading = updateJob.isPending;

  if (!isEditing) {
    return (
      <div className={styles.container}>
        <div className={`${styles.viewContainer} ${scrollStyles.scrollbarVerticalContainer}`}>
          {job.notes && job.notes.trim() ? (
            <Markdown source={job.notes} />
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No notes yet</p>
              <p className={styles.emptyStateSubtext}>
                Add notes to keep track of important information about this job
              </p>
            </div>
          )}

          <div className={styles.buttonGroupContainer}>
            <EnhancedButton
              label="Edit"
              colorTheme="secondary"
              onClick={handleEditClick}
              startIcon={<EditIcon sx={{ fontSize: '1rem' }} />}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${scrollStyles.scrollbarVerticalContainer}`}>
      <div className={styles.editContainer}>
        <EnhancedTextInputArea
          label="Notes"
          value={notes}
          onChange={handleChange}
          placeholder="Write your notes here... Supports Markdown formatting

Examples:
- **Bold text** and *italic text*
- # Headers
- [Links](https://example.com)
- Lists (ordered and unordered)
- `inline code` and code blocks
- Tables (using | syntax)"
          minRows={12}
          maxRows={20}
          disabled={isLoading}
          customProps={{
            childProps: {
              textfieldBox: {
                sx: { flex: 1, width: '100%' },
              },
            },
          }}
        />

        <div className={styles.buttonGroupContainer}>
          <EnhancedButton
            label="Cancel"
            colorTheme="secondary"
            onClick={handleCancelClick}
            disabled={isLoading}
          />
          <EnhancedButton
            label="Save"
            colorTheme="primary"
            onClick={handleSaveClick}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default JobNotesTab;
