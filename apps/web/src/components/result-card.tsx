import { useState } from 'react';
import { Radio } from '@mui/material';
import { Check, Article, ArrowForward } from '@mui/icons-material';
import { EnhancedTooltipWithText } from '@repo/ui';
import type { PaginatedResultListItem } from '@repo/shared-types';
import type { StaleType } from './job-ats-tab';
import styles from './style/result-card.module.css';

interface ResultCardProps {
  result: PaginatedResultListItem;
  isSelected: boolean;
  isStale: boolean;
  staleType: StaleType;
  isPrimary: boolean;
  onSelect: (result: PaginatedResultListItem) => void;
  onViewResume: (result: PaginatedResultListItem) => void;
  onViewResult: (result: PaginatedResultListItem) => void;
  onSetPrimary: (result: PaginatedResultListItem) => void;
}

const scoreClass = (score: number) => {
  if (score >= 70) return styles.scoreHigh;
  if (score >= 40) return styles.scoreMid;
  return styles.scoreLow;
};

const getStaleLabelText = (staleType: StaleType): string => {
  switch (staleType) {
    case 'job':
      return 'job updated';
    case 'version':
      return 'version updated';
    case 'both':
      return 'job & version updated';
    default:
      return '';
  }
};

export const ResultCard = ({
  result,
  isSelected,
  isStale,
  staleType,
  isPrimary,
  onSelect,
  onViewResume,
  onViewResult,
  onSetPrimary,
}: ResultCardProps) => {
  const [isStaleExpanded, setIsStaleExpanded] = useState(false);

  const handleStaleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStaleExpanded(!isStaleExpanded);
  };

  const handleRadioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetPrimary(result);
  };

  const radioTooltip = isPrimary ? 'Primary' : 'Click to set as Primary';

  return (
    <div
      className={`${styles.resultCard} ${isSelected ? styles.selected : ''} ${isStale ? styles.staleCard : ''}`}
      onClick={() => onSelect(result)}
    >
      {/* Section 1: Radio button with tooltip */}
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={isPrimary}
            onClick={handleRadioClick}
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </EnhancedTooltipWithText>
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
            {isStale && staleType && (
              <span
                className={`${styles.staleIndicator} ${isStaleExpanded ? styles.staleIndicatorExpanded : ''}`}
                onClick={handleStaleClick}
              >
                [stale{isStaleExpanded ? `: ${getStaleLabelText(staleType)}` : ''}]
              </span>
            )}
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
