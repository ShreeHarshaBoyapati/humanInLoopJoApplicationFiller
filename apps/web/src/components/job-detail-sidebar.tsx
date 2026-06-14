import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import { EnhancedButton } from '@repo/ui';
import type { Job } from '@repo/shared-types';
import { useUpdateJob, useDeleteJob } from '../hooks/use-jobs';
import { useStore } from '../store';
import styles from './style/job-detail-sidebar.module.css';
import { JobOverviewTab } from './job-overview-tab';
import { JobAtsTab } from './job-ats-tab';
import { JobNotesTab } from './job-notes-tab';
import { SmallCalendarPanel } from './small-calendar-panel';
import { ConfirmModal } from './confirm-modal';

interface JobDetailSidebarProps {
  job: Job;
  onClose: () => void;
}

type TabType = 'overview' | 'ats' | 'notes';

const TABS: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ats', label: 'ATS History' },
  { id: 'notes', label: 'Notes' },
];

export function JobDetailSidebar({ job: initialJob, onClose }: JobDetailSidebarProps) {
  const [localJob, setLocalJob] = useState<Job>(initialJob);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

  const getCompanyInitial = (companyName: string) => {
    return companyName ? companyName.charAt(0).toUpperCase() : 'C';
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteValue = !localJob.favorite;
    updateJob.mutate(
      { id: localJob.id, favorite: newFavoriteValue },
      {
        onSuccess: () => {
          setLocalJob((prev) => ({ ...prev, favorite: newFavoriteValue }));
          showSnackbar(newFavoriteValue ? 'Job added to favorites' : 'Job removed from favorites', {
            severity: 'success',
          });
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to update favorite', {
            severity: 'error',
          });
        },
      }
    );
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateJob.mutate(
      { id: localJob.id, status: 'archived', invalidateQueries: true },
      {
        onSuccess: () => {
          showSnackbar('Job archived successfully', { severity: 'success' });
          onClose();
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to archive job', {
            severity: 'error',
          });
        },
      }
    );
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteJob.mutateAsync(
        { id: localJob.id },
        {
          onSuccess: () => {
            showSnackbar('Job deleted successfully', { severity: 'success' });
            setIsDeleteModalOpen(false);
            onClose();
          },
          onError: (error) => {
            showSnackbar(error instanceof Error ? error.message : 'Failed to delete job', {
              severity: 'error',
            });
          },
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job';
      if (message === 'Delete request was cancelled') {
        return;
      }
      showSnackbar(message, { severity: 'error' });
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deleteJob.isPending) {
      setIsDeleteModalOpen(false);
      return;
    }
    // Request is in flight: abort it and close the modal
    deleteJob.cancel();
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <div className={styles.sidebarOverlay} onClick={handleOverlayClick}>
        <div className={styles.sidebarPanel}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.jobIcon}>{getCompanyInitial(localJob.companyName)}</div>
              <div className={styles.jobInfo}>
                <h2 className={styles.jobTitle}>{localJob.title}</h2>
                <span className={styles.jobCompany}>{localJob.companyName}</span>
              </div>
            </div>
            <div className={styles.headerRight}>
              <EnhancedButton
                label="Favorite"
                colorTheme={localJob.favorite ? 'tertiary' : 'secondary'}
                onClick={handleFavoriteClick}
                disabled={updateJob.isPending}
                startIcon={
                  localJob.favorite ? (
                    <FavoriteIcon sx={{ fontSize: '1rem' }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: '1rem' }} />
                  )
                }
              />
              <EnhancedButton
                label="Archive"
                colorTheme="secondary"
                onClick={handleArchiveClick}
                disabled={updateJob.isPending}
                startIcon={<ArchiveIcon sx={{ fontSize: '1rem' }} />}
              />
              <EnhancedButton
                label="Delete"
                colorTheme="negativeSecondary"
                onClick={handleDeleteClick}
                disabled={deleteJob.isPending}
                startIcon={<DeleteIcon sx={{ fontSize: '1rem' }} />}
              />
              <button type="button" className={styles.closeButton} onClick={onClose} title="Close">
                <CloseIcon sx={{ fontSize: '1.25rem' }} />
              </button>
            </div>
          </div>

          {/* Content Wrapper with Tabs and Calendar */}
          <div className={styles.contentWrapper}>
            {/* Left Section - Tabs */}
            <div className={styles.leftSection}>
              <div className={styles.tabsBar}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                  <JobOverviewTab
                    job={localJob}
                    onJobUpdate={(updatedJob) => setLocalJob(updatedJob)}
                  />
                )}
                {activeTab === 'ats' && (
                  <JobAtsTab
                    jobId={localJob.id}
                    jobDataUpdatedAt={localJob.dataUpdatedAt}
                    primaryResultId={localJob.primaryResultId}
                    onJobUpdate={(updatedJob) => setLocalJob(updatedJob)}
                  />
                )}
                {activeTab === 'notes' && (
                  <JobNotesTab
                    job={localJob}
                    onJobUpdate={(updatedJob) => setLocalJob(updatedJob)}
                  />
                )}
              </div>
            </div>

            {/* Right Section - Calendar */}
            <div className={styles.rightSection}>
              <SmallCalendarPanel job={localJob} />
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Job"
        message={
          deleteJob.isPending
            ? 'Cancelling will abort the in-flight delete request.'
            : `Are you sure you want to delete "${localJob.title}" at ${localJob.companyName}? This action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel={'Cancel'}
        isLoading={deleteJob.isPending}
        cancellation={true}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseDeleteModal}
      />
    </>
  );
}
