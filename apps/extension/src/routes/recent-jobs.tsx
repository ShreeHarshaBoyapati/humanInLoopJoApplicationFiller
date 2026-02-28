import { createFileRoute, Link, useNavigate, ErrorComponent } from '@tanstack/react-router';
import { useState } from 'react';
import { EnhancedButton } from '@repo/ui';
import type { Job, JobList } from '@repo/shared-types';
import styles from './style/recent-jobs.module.css';

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
    <div style={{ color: '#fff', padding: '1rem' }}>Loading recent jobs...</div>
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
      <div className={styles.header}>
        <h1 className={styles.title}>Recent Jobs</h1>
        <Link to="/" className={styles.link}>
          Back to Home
        </Link>
      </div>

      <div className={styles.listContainer}>
        {error && <div className={styles.error}>{error}</div>}

        {jobs.length === 0 && !error && (
          <div className={styles.emptyState}>
            You haven&apos;t tracked any jobs yet.
            <br />
            <br />
            <EnhancedButton
              label="Track a Job"
              colorTheme="primary"
              onClick={() => navigate({ to: '/job' })}
            />
          </div>
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

            <div className={styles.jobActions}>
              <EnhancedButton
                label="Edit"
                colorTheme="tertiary"
                size="small"
                onClick={() => navigate({ to: '/job', search: { jobId: job.id } })}
              />
              <EnhancedButton
                label="Delete"
                colorTheme="negativeSecondary"
                size="small"
                onClick={() => handleDelete(job.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
