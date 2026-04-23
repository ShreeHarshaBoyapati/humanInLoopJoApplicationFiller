import { Radio } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { EnhancedTooltipWithText } from '@repo/ui';
import type { ResumeMetadata } from '@repo/shared-types';
import styles from './style/resume-card.module.css';

interface ResumeCardProps {
  resume: ResumeMetadata;
  isSelected: boolean;
  onSetActive: (resume: ResumeMetadata) => void;
  onNavigate: (resume: ResumeMetadata) => void;
  onEdit: (resume: ResumeMetadata, e: React.MouseEvent) => void;
  onDelete: (resumeId: string, e: React.MouseEvent) => void;
}

export const ResumeCard = ({
  resume,
  isSelected,
  onSetActive,
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

  const radioTooltip = resume.active ? 'Active' : 'Click to set as active';

  return (
    <div className={`${styles.resumeCard} ${isSelected ? styles.selected : ''}`}>
      {/* Section 1: Radio button with tooltip */}
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={isSelected}
            onChange={() => onSetActive(resume)}
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </EnhancedTooltipWithText>
      </div>

      {/* Section 2: Data (file name, keywords, date) */}
      <div className={styles.dataSection}>
        <div className={styles.resumeInfo}>
          <div className={styles.resumeNameRow}>
            <p className={styles.resumeName}>{resume.fileName}</p>
          </div>
          <p className={styles.resumeKeywords}>{resume.keywords?.join(', ') || 'No keywords'}</p>
          <p className={styles.resumeDate}>Created: {formatDate(resume.createdAt)}</p>
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: 'rotate(0deg)' }}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
