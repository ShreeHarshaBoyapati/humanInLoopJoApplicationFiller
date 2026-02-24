import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
// @ts-ignore
import { useState, useEffect } from 'react';
import { EnhancedButton } from '@repo/ui';
// @ts-ignore
import type { Job } from '@repo/shared-types';
import styles from './style/recent-jobs.module.css';

export const Route = createFileRoute('/recent-jobs' as any)({
  component: RecentJobsComponent,
});

function RecentJobsComponent() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = () => {
    setLoading(true);
    setError(null);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: 'GET_JOBS',
          payload: { limit: 5, sortBy: 'createdAt', sortOrder: 'DESC' },
        },
        (response: any) => {
          setLoading(false);
          if (response?.success) {
            setJobs(response.data?.jobs || []);
          } else {
            setError(response?.error || 'Failed to load jobs');
          }
        }
      );
    } else {
      setLoading(false);
      setError('Chrome runtime not available');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'DELETE_JOB', payload: { id } }, (response: any) => {
          if (response?.success) {
            fetchJobs(); // Refresh the list
          } else {
            alert(response?.error || 'Failed to delete job');
          }
        });
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
        {loading && <p style={{ color: '#fff' }}>Loading jobs...</p>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && jobs.length === 0 && !error && (
          <div className={styles.emptyState}>
            You haven't tracked any jobs yet.
            <br />
            <br />
            <EnhancedButton
              label="Track a Job"
              colorTheme="primary"
              onClick={() => navigate({ to: '/job' })}
            />
          </div>
        )}

        {!loading &&
          jobs.map((job) => (
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
                  onClick={() => navigate({ to: '/job', search: { jobId: job.id } as any })}
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
