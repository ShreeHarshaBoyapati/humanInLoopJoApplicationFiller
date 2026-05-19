import { Radio } from '@mui/material';
import { Edit, Delete, ArrowForward } from '@mui/icons-material';
import { EnhancedTooltipWithText } from '@repo/ui';
import type { PaginatedResumeListItem } from '@repo/shared-types';
import styles from './style/resume-card.module.css';

interface ResumeCardProps {
  resume: PaginatedResumeListItem;
  isSelected: boolean;
  onNavigate: (resume: PaginatedResumeListItem) => void;
  onEdit: (resume: PaginatedResumeListItem, e: React.MouseEvent) => void;
  onDelete: (resumeId: string, e: React.MouseEvent) => void;
}

export const ResumeCard = ({
  resume,
  isSelected,
  onNavigate,
  onEdit,
  onDelete,
}: ResumeCardProps) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const radioTooltip = resume.active ? 'Active' : 'Inactive';

  return (
    <div className={`${styles.resumeCard} ${isSelected ? styles.selected : ''}`}>
      {/* Section 1: Radio button with tooltip */}
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={resume.active}
            disabled
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-disabled': {
                color: 'var(--grey-500)',
                pointerEvents: 'none',
                opacity: 0.5,
              },
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </EnhancedTooltipWithText>
      </div>

      {/* Section 2: Data (file name, versions count, date) */}
      <div className={styles.dataSection}>
        <div className={styles.resumeInfo}>
          <div className={styles.resumeNameRow}>
            <p className={styles.resumeName}>{resume.fileName}</p>
          </div>
          <div className={styles.versionAndDate}>
            <span>{resume.versionsCount} version(s)</span>
            <span className={styles.dotSeparator}>·</span>
            <span>Updated: {formatDate(resume.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Section 3: Action buttons */}
      <div className={styles.actionsSection}>
        <button type="button" className={styles.actionButton} onClick={(e) => onEdit(resume, e)}>
          <Edit sx={{ fontSize: '1.25rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.delete}`}
          onClick={(e) => onDelete(resume.id, e)}
        >
          <Delete sx={{ fontSize: '1.25rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.arrow}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(resume);
          }}
        >
          <ArrowForward sx={{ fontSize: '1.25rem' }} />
        </button>
      </div>
    </div>
  );
};
