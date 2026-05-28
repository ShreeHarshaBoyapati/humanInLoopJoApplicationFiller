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

interface JobDetailSidebarProps {
  job: Job;
  onClose: () => void;
}

type TabType = 'overview' | 'resume' | 'matching' | 'notes';

const TABS: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'resume', label: 'Resume' },
  { id: 'matching', label: 'Matching' },
  { id: 'notes', label: 'Notes' },
];

export function JobDetailSidebar({ job: initialJob, onClose }: JobDetailSidebarProps) {
  const [localJob, setLocalJob] = useState<Job>(initialJob);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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
    deleteJob.mutate(
      { id: localJob.id },
      {
        onSuccess: () => {
          showSnackbar('Job deleted successfully', { severity: 'success' });
          onClose();
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to delete job', {
            severity: 'error',
          });
        },
      }
    );
  };

  return (
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
              <div className={styles.tabContentPlaceholder}>
                {activeTab === 'overview' && <div>Overview content goes here</div>}
                {activeTab === 'resume' && <div>Resume content goes here</div>}
                {activeTab === 'matching' && <div>Matching content goes here</div>}
                {activeTab === 'notes' && <div>Notes content goes here</div>}
              </div>
            </div>
          </div>

          {/* Right Section - Calendar */}
          <div className={styles.rightSection}>
            <div className={styles.calendarContent}>
              <div className={styles.calendarPlaceholder}>
                <span>Calendar section</span>
                <span>Date picker and events</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
