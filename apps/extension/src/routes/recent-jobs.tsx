import { createFileRoute, useNavigate, ErrorComponent } from '@tanstack/react-router';
import { useState } from 'react';
import { EnhancedButton } from '@repo/ui';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Job, JobList } from '@repo/shared-types';
import styles from './style/recent-jobs.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import AddIcon from '@mui/icons-material/Add';

type JobFetchList = { success: false; error: string } | { success: true; data: JobList };

export const Route = createFileRoute('/recent-jobs')({
  shouldReload: true,
  loader: async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return { jobs: [], error: 'Chrome runtime not available' };
    }

    return new Promise<{ jobs: Job[]; error: string | null }>((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'GET_JOBS', payload: { limit: 5, sortBy: 'createdAt', sortOrder: 'DESC' } },
        (res: JobFetchList) => {
          if (res?.success) {
            resolve({ jobs: res.data?.jobs || [], error: null });
          } else if (!res?.success) {
            resolve({ jobs: [], error: res?.error || 'Failed to load jobs' });
          }
        }
      );
    });
  },
  component: RecentJobsComponent,
  pendingComponent: () => (
    <div style={{ color: styleConstants.white900, padding: '1rem' }}>Loading recent jobs...</div>
  ),
  errorComponent: ErrorComponent,
});

function RecentJobsComponent() {
  const navigate = useNavigate();
  const { jobs: loaderJobs, error: loaderError } = Route.useLoaderData();

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter out optimistically deleted jobs from the fresh loader data
  const jobs = loaderJobs.filter((j) => !deletedIds.has(j.id));
  const error = loaderError || deleteError;

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: 'DELETE_JOB', payload: { id } },
          (res: { success: boolean; error?: string }) => {
            if (res?.success) {
              setDeletedIds((prev) => new Set(prev).add(id));
            } else {
              setDeleteError(res?.error || 'Failed to delete job');
            }
          }
        );
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainHeader}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Recent Jobs</h1>
        </div>
        <EnhancedButton
          label="Create a Job"
          colorTheme="tertiary"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => navigate({ to: '/job' })}
        />
      </div>

      <div className={styles.listContainer}>
        {error && <div className={styles.error}>{error}</div>}

        {jobs.length === 0 && !error && (
          <div className={styles.emptyState}>You haven&apos;t tracked any jobs yet.</div>
        )}

        {jobs.map((job) => (
          <div key={job.id} className={styles.jobCard}>
            <div className={styles.jobDetails}>
              <h3 className={styles.jobTitle}>{job.title || 'Untitled Role'}</h3>
              <p className={styles.jobCompany}>{job.companyName || 'Unknown Company'}</p>

              <div className={styles.jobMeta}>
                <span className={styles.jobStatus}>{job.status || 'draft'}</span>
                {job.createdAt && (
                  <span className={styles.jobDate}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.actionContainer}>
              <button
                className={styles.jobActions}
                aria-label="Analyze"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: '/autofill', search: { jobId: job.id } });
                }}
                title="Analyze"
              >
                <AutoAwesomeIcon fontSize="small" />
              </button>
              <button
                className={styles.jobActions}
                aria-label="Edit persona"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: '/job', search: { jobId: job.id } });
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </button>
              <button
                className={styles.jobActions}
                aria-label="Delete persona"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(job.id);
                }}
                style={{
                  color: styleConstants.red700,
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
