import { Favorite, FavoriteBorder } from '@mui/icons-material';
import { EnhancedStepper } from '@repo/ui';
import type { Job } from '@repo/shared-types';
import styles from './style/job-tracker-card.module.css';

interface JobTrackerCardProps {
  job: Job;
  statusSteps: string[];
  isLoading?: boolean;
  onFavoriteToggle: (job: Job) => void;
  onStatusChange: (job: Job, newStatus: string) => void;
}

export const JobTrackerCard = ({
  job,
  statusSteps,
  isLoading = false,
  onFavoriteToggle,
  onStatusChange,
}: JobTrackerCardProps) => {
  const getCompanyInitial = (companyName: string) => {
    return companyName ? companyName.charAt(0).toUpperCase() : 'C';
  };

  const currentStepIndex = statusSteps.findIndex(
    (step) => step.toLowerCase() === job.status.toLowerCase()
  );
  const activeStep = currentStepIndex >= 0 ? currentStepIndex : 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(job);
  };

  const handleStepClick = (_stepIndex: number, stepLabel: string) => {
    onStatusChange(job, stepLabel.toLowerCase());
  };

  return (
    <div className={styles.jobCard}>
      {/* Section 1: Favorite Icon */}
      <div className={styles.favoriteSection}>
        <button
          type="button"
          className={`${styles.favoriteButton} ${job.favorite ? styles.active : ''}`}
          onClick={handleFavoriteClick}
        >
          {job.favorite ? (
            <Favorite sx={{ fontSize: '1.25rem' }} />
          ) : (
            <FavoriteBorder sx={{ fontSize: '1.25rem' }} />
          )}
        </button>
      </div>

      {/* Section 2: Job Icon, Title, Company, Tags */}
      <div className={styles.dataSection}>
        <div className={styles.jobIcon}>{getCompanyInitial(job.companyName)}</div>
        <div className={styles.jobInfo}>
          <div className={styles.jobTitleRow}>
            <p className={styles.jobTitle}>{job.title}</p>
            <span className={styles.jobCompany}>{job.companyName}</span>
          </div>
          {job.tags && job.tags.length > 0 && (
            <div className={styles.jobTags}>
              {job.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className={styles.jobTag}>
                  {tag}
                </span>
              ))}
              {job.tags.length > 3 && <span className={styles.jobTag}>+{job.tags.length - 3}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Status Stepper */}
      <div className={styles.statusSection}>
        <div className={styles.stepperWrapper}>
          <EnhancedStepper
            steps={statusSteps}
            activeStep={activeStep}
            disabled={isLoading}
            onStepClick={handleStepClick}
            customProps={{
              childProps: {
                stepConnector: {
                  sx: {
                    left: `calc(-50% + 4px)`,
                    right: `calc(50% + 4px)`,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};
