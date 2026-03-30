import { createFileRoute, useNavigate, ErrorComponent } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Job, JobList } from '@repo/shared-types';
import styleConstants from '@repo/ui/constants/style-constants.js';
import Step1JobDetails from '../components/step1-job-details';
import styles from '../routes/style/job.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import { useState } from 'react';
import { EnhancedButton } from '@repo/ui';

export interface JobSearch {
  jobId?: string;
  mode?: 'autofill' | 'update';
  step?: number;
}

type JobFetchList =
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      data: JobList;
    };

export const Route = createFileRoute('/job')({
  shouldReload: true,
  validateSearch: (search: Record<string, unknown>): JobSearch => {
    return {
      jobId: search.jobId as string | undefined,
    };
  },
  loaderDeps: ({ search: { jobId } }) => ({ jobId }),
  loader: async ({ deps: { jobId } }) => {
    if (!jobId || typeof chrome === 'undefined' || !chrome.runtime) {
      return { jobData: null, isEditing: !!jobId, error: null };
    }

    return new Promise<{ jobData: Job | null; isEditing: boolean; error: string | null }>(
      (resolve) => {
        chrome.runtime.sendMessage(
          { action: 'GET_JOBS', payload: { limit: 1, id: jobId } },
          (res: JobFetchList) => {
            if (res?.success && res.data?.jobs) {
              const job = res.data.jobs[0] || null;
              resolve({
                jobData: job || null,
                isEditing: true,
                error: job ? null : 'Job not found',
              });
            } else if (!res?.success) {
              resolve({
                jobData: null,
                isEditing: true,
                error: res?.error || 'Failed to fetch job',
              });
            }
          }
        );
      }
    );
  },
  component: JobComponent,
  pendingComponent: () => (
    <div style={{ color: styleConstants.white700, padding: '1rem' }}>Loading job data...</div>
  ),
  errorComponent: ErrorComponent,
});

function JobComponent() {
  const navigate = useNavigate();
  const { jobData, isEditing, error: loaderError } = Route.useLoaderData();
  const [savedJobId, setSavedJobId] = useState<string | null>(jobData?.id || null);

  const handleUpdate = async () => {
    const result = await step1.submit();
    if (result.success && result.jobId) {
      setSavedJobId(result.jobId);
      navigate({ to: '/recent-jobs' });
    }
  };

  const onCancel = () => {
    navigate({ to: '/recent-jobs' });
  };

  if (loaderError) {
    return (
      <div style={{ color: styleConstants.white700, padding: '1rem' }}>
        <p>Error: {loaderError}</p>
      </div>
    );
  }

  const step1 = Step1JobDetails({
    jobData: savedJobId ? ({ ...(jobData || {}), id: savedJobId } as Job) : jobData,
    isEditing: isEditing || !!savedJobId,
    onSaveSuccess: () => {},
    onError: () => {},
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onCancel} aria-label="Go back">
          <ArrowBackIcon />
        </button>
        <h1 className={styles.title}>{savedJobId ? 'Update Job' : 'Add Job'}</h1>
      </div>
      <div className={styles.formContainer}>
        <div className={`${styles.scrollArea} ${scrollStyles.scrollbarVerticalContainer}`}>
          {step1.renderForm()}
        </div>
      </div>
      {step1.error && <div className={styles.error}>{step1.error}</div>}
      <div className={styles.buttonGroup}>
        <EnhancedButton
          label="Cancel"
          colorTheme="secondary"
          onClick={onCancel || (() => {})}
          disabled={step1.loading}
        />
        <EnhancedButton
          label={savedJobId ? 'Update' : 'Add'}
          colorTheme="primary"
          onClick={handleUpdate}
          disabled={step1.loading}
        />
      </div>
    </div>
  );
}
