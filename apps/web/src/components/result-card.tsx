import { Radio } from '@mui/material';
import { Check, Article, ArrowForward } from '@mui/icons-material';
import type { PaginatedResultListItem } from '@repo/shared-types';
import styles from './style/result-card.module.css';

interface ResultCardProps {
  result: PaginatedResultListItem;
  isSelected: boolean;
  onSelect: (result: PaginatedResultListItem) => void;
  onViewResume: (result: PaginatedResultListItem) => void;
  onViewResult: (result: PaginatedResultListItem) => void;
}

const scoreClass = (score: number) => {
  if (score >= 70) return styles.scoreHigh;
  if (score >= 40) return styles.scoreMid;
  return styles.scoreLow;
};

export const ResultCard = ({
  result,
  isSelected,
  onSelect,
  onViewResume,
  onViewResult,
}: ResultCardProps) => {
  return (
    <div
      className={`${styles.resultCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(result)}
    >
      {/* Section 1: Radio button */}
      <div className={styles.radioSection}>
        <Radio
          checked={isSelected}
          sx={{
            color: 'var(--grey-500)',
            '&.Mui-checked': {
              color: 'var(--blue-500)',
            },
          }}
        />
      </div>

      {/* Section 2: Data */}
      <div className={styles.dataSection}>
        <div className={styles.resultInfo}>
          <div className={styles.resultNameRow}>
            <span className={styles.versionName}>{result.versionName}</span>
            <span className={styles.separator}>-</span>
            <span className={styles.resumeName}>{result.resumeName}</span>
            <span className={styles.personaName}>({result.personaName})</span>
            <Check className={styles.checkIcon} sx={{ fontSize: '1rem' }} />
            <span className={styles.scoredText}>scored</span>
            <span className={`${styles.scoreValue} ${scoreClass(result.score)}`}>
              {result.score}
            </span>
          </div>
          <div className={styles.dateInfo}>
            {new Date(result.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Action buttons */}
      <div className={styles.actionsSection}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.docButton}`}
          onClick={(e) => {
            e.stopPropagation();
            onViewResume(result);
          }}
          title="View Resume"
        >
          <Article sx={{ fontSize: '1.25rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.arrow}`}
          onClick={(e) => {
            e.stopPropagation();
            onViewResult(result);
          }}
          title="View Result"
        >
          <ArrowForward sx={{ fontSize: '1.25rem' }} />
        </button>
      </div>
    </div>
  );
};
