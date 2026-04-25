import { useState, useEffect, type ChangeEvent } from 'react';
import { Modal, EnhancedTextField, EnhancedButton } from '@repo/ui';
import { useUpdateResume } from '../hooks/use-resumes';
import type { PaginatedResumeListItem } from '@repo/shared-types';
import styles from './style/edit-resume-modal.module.css';

interface EditResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: PaginatedResumeListItem | null;
  personaId: string;
}

export function EditResumeModal({ isOpen, onClose, resume, personaId }: EditResumeModalProps) {
  const [resumeName, setResumeName] = useState('');
  const [nameError, setNameError] = useState('');
  const [apiError, setApiError] = useState('');

  const updateResume = useUpdateResume();

  useEffect(() => {
    if (isOpen && resume) {
      setResumeName(resume.fileName);
      setNameError('');
      setApiError('');
    }
  }, [isOpen, resume]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResumeName(e.target.value);
    if (nameError) setNameError('');
    if (apiError) setApiError('');
  };

  const handleSave = () => {
    if (!resumeName.trim()) {
      setNameError('Resume name is required');
      return;
    }

    if (!resume) return;

    updateResume.mutate(
      { id: resume.id, fileName: resumeName.trim(), personaId },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setApiError(error instanceof Error ? error.message : 'Failed to update resume');
        },
      }
    );
  };

  const handleCancel = () => {
    setResumeName('');
    setNameError('');
    setApiError('');
    onClose();
  };

  const isPending = updateResume.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      headerTitle="Edit Resume"
      footer={
        <div className={styles.footerContainer}>
          <EnhancedButton
            label="Cancel"
            colorTheme="secondary"
            onClick={handleCancel}
            disabled={isPending}
          />
          <EnhancedButton
            label="Save"
            colorTheme="primary"
            onClick={handleSave}
            disabled={isPending}
          />
        </div>
      }
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '500px', minWidth: '400px' } },
        },
      }}
    >
      <div className={styles.form}>
        <EnhancedTextField
          label="Resume Name"
          placeholder="Enter resume name"
          value={resumeName}
          onChange={handleNameChange}
          variant={nameError ? 'error' : 'default'}
          helperText={nameError}
        />
        {apiError && <p className={styles.apiError}>{apiError}</p>}
      </div>
    </Modal>
  );
}
