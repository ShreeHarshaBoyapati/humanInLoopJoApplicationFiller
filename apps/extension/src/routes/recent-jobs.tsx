import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EnhancedButton } from '@repo/ui';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Job, JobList } from '@repo/shared-types';
import styles from './style/recent-jobs.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import AddIcon from '@mui/icons-material/Add';
import { getCurrentToken } from '../db/personas-cache';
import { getCachedRecentJobs, setCachedRecentJobs, invalidateJobsCache } from '../db/jobs-cache';
import { ConfirmModal } from '../components/confirm-modal';

type JobFetchList = { success: false; error: string } | { success: true; data: JobList };

export const Route = createFileRoute('/recent-jobs')({
  component: RecentJobsComponent,
});

function RecentJobsComponent() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteRequestIdRef = useRef<string | null>(null);

  const limit = 5;
  const sortBy = 'createdAt';
  const sortOrder = 'DESC' as const;

  const fetchJobs = useCallback(
    async (token: string | null, { invalidate = false } = {}) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        setError('Chrome runtime not available');
        setLoading(false);
        return;
      }

      if (invalidate) {
        await invalidateJobsCache();
      }

      const cached =
        token && !invalidate ? await getCachedRecentJobs(token, limit, sortBy, sortOrder) : null;

      if (cached && cached.jobs.length > 0) {
        setJobs(cached.jobs);
        setLoading(false);
        return;
      }

      chrome.runtime.sendMessage(
        { action: 'GET_JOBS', payload: { limit, sortBy, sortOrder } },
        async (res: JobFetchList) => {
          if (res?.success) {
            const fresh = res.data?.jobs || [];
            setJobs(fresh);
            if (token) {
              await setCachedRecentJobs(token, limit, sortBy, sortOrder, fresh);
            }
          } else {
            setError(res?.error || 'Failed to load jobs');
          }
          setLoading(false);
        }
      );
    },
    [limit, sortBy, sortOrder]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getCurrentToken();
      if (cancelled) return;
      await fetchJobs(token);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchJobs]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handle = (message: {
      action?: string;
      payload?: { resource?: string; action?: string };
    }) => {
      if (message.action !== 'RESOURCE_CHANGED') return;
      const payload = message.payload;
      if (!payload || payload.resource !== 'job') return;
      void (async () => {
        const token = await getCurrentToken();
        await fetchJobs(token, { invalidate: true });
      })();
    };

    chrome.runtime.onMessage.addListener(handle);
    return () => {
      chrome.runtime.onMessage.removeListener(handle);
    };
  }, [fetchJobs]);

  const visibleJobs = jobs;
  const displayError = error || deleteError;

  const openDeleteModal = (id: string) => {
    setPendingDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting && pendingDeleteId && deleteRequestIdRef.current) {
      chrome.runtime.sendMessage({
        action: 'CANCEL_DELETE_JOB',
        payload: { requestId: deleteRequestIdRef.current },
      });
    }
    setIsDeleteModalOpen(false);
    setPendingDeleteId(null);
    deleteRequestIdRef.current = null;
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId || typeof chrome === 'undefined' || !chrome.runtime) return;

    const id = pendingDeleteId;
    const requestId = crypto.randomUUID();
    deleteRequestIdRef.current = requestId;
    setIsDeleting(true);
    setDeleteError(null);

    chrome.runtime.sendMessage(
      { action: 'DELETE_JOB', payload: { id, requestId } },
      async (res: { success: boolean; cancelled?: boolean; error?: string }) => {
        deleteRequestIdRef.current = null;

        if (chrome.runtime.lastError) {
          setDeleteError(chrome.runtime.lastError.message || 'Failed to delete job');
          setIsDeleting(false);
          return;
        }

        if (res?.cancelled) {
          setIsDeleting(false);
          return;
        }

        if (res?.success) {
          const token = await getCurrentToken();
          await fetchJobs(token, { invalidate: true });
          setIsDeleteModalOpen(false);
          setPendingDeleteId(null);
        } else {
          setDeleteError(res?.error || 'Failed to delete job');
        }
        setIsDeleting(false);
      }
    );
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
        {loading && <div className={styles.loading}>Loading recent jobs...</div>}

        {displayError && <div className={styles.error}>{displayError}</div>}

        {!loading && visibleJobs.length === 0 && !displayError && (
          <div className={styles.emptyState}>No jobs tracked yet.</div>
        )}

        {visibleJobs.map((job) => (
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
                  openDeleteModal(job.id);
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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        cancellation={true}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
