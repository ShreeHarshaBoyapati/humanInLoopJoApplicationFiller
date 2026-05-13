import { useState, useEffect, type ChangeEvent } from 'react';
import { Modal, EnhancedTextField, EnhancedButton } from '@repo/ui';
import { useBranchVersion } from '../hooks/use-resume-versions';
import styles from './style/branch-version-modal.module.css';
import { CircularProgress } from '@mui/material';

interface BranchVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  versionId: string;
  defaultFileName: string;
}

export function BranchVersionModal({
  isOpen,
  onClose,
  resumeId,
  versionId,
  defaultFileName,
}: BranchVersionModalProps) {
  const [fileName, setFileName] = useState('');
  const [commit, setCommit] = useState('');
  const [fileNameError, setFileNameError] = useState('');
  const [apiError, setApiError] = useState('');

  const branchVersion = useBranchVersion();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName(defaultFileName);
      setCommit('');
      setFileNameError('');
      setApiError('');
    }
  }, [isOpen, defaultFileName]);

  const handleFileNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
    if (fileNameError) setFileNameError('');
    if (apiError) setApiError('');
  };

  const handleCommitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCommit(e.target.value);
    if (apiError) setApiError('');
  };

  const handleBranch = async () => {
    if (!fileName.trim()) {
      setFileNameError('File name is required');
      return;
    }

    try {
      await branchVersion.mutateAsync({
        resumeId,
        versionId,
        newFileName: fileName.trim(),
        commit: commit.trim() || undefined,
      });

      // Reset state on success
      setFileName('');
      setCommit('');
      setFileNameError('');
      setApiError('');
      onClose();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to branch version');
    }
  };

  const handleCancel = () => {
    setFileName('');
    setCommit('');
    setFileNameError('');
    setApiError('');
    onClose();
  };

  const isPending = branchVersion.isPending;

  const renderFooter = () => {
    return (
      <div className={styles.footerContainer}>
        <EnhancedButton
          label="Cancel"
          colorTheme="secondary"
          onClick={handleCancel}
          disabled={isPending}
        />
        <EnhancedButton
          label={isPending ? 'Branching...' : 'Branch'}
          colorTheme="primary"
          onClick={handleBranch}
          disabled={isPending || !fileName.trim()}
          startIcon={isPending ? <CircularProgress color="inherit" size={'1rem'} /> : undefined}
        />
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      headerTitle="Branch Version"
      footer={renderFooter()}
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '500px', minWidth: '400px' } },
        },
      }}
    >
      <div className={styles.form}>
        <EnhancedTextField
          label="File Name"
          placeholder="Enter file name for the new resume"
          value={fileName}
          onChange={handleFileNameChange}
          variant={fileNameError ? 'error' : 'default'}
          helperText={fileNameError}
        />
        <EnhancedTextField
          label="Commit Message (optional)"
          placeholder="Enter commit message"
          value={commit}
          onChange={handleCommitChange}
        />
        {apiError && <p className={styles.apiError}>{apiError}</p>}
      </div>
    </Modal>
  );
}
