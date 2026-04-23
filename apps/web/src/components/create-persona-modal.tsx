import { useState, useEffect, type ChangeEvent } from 'react';
import { Modal, EnhancedTextField } from '@repo/ui';
import { EnhancedButton } from '@repo/ui';
import { useCreatePersona, useUpdatePersona } from '../hooks/use-personas';
import type { Persona } from '@repo/shared-types';
import styles from './style/create-persona-modal.module.css';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Persona;
}

export function CreatePersonaModal({ isOpen, onClose, initialData }: CreatePersonaModalProps) {
  const [title, setTitle] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  const isEditMode = !!initialData;
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setKeywordsInput(initialData.keywords?.join(', ') || '');
      } else {
        setTitle('');
        setKeywordsInput('');
      }
      setTitleError('');
      setApiError('');
    }
  }, [isOpen, initialData]);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (titleError) setTitleError('');
    if (apiError) setApiError('');
  };

  const handleKeywordsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKeywordsInput(e.target.value);
    if (apiError) setApiError('');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (isEditMode && initialData) {
      updatePersona.mutate(
        { id: initialData.id, title: title.trim(), keywords },
        {
          onSuccess: () => {
            setTitle('');
            setKeywordsInput('');
            setApiError('');
            onClose();
          },
          onError: (error) => {
            setApiError(error instanceof Error ? error.message : 'Failed to update persona');
          },
        }
      );
    } else {
      createPersona.mutate(
        { title: title.trim(), keywords },
        {
          onSuccess: () => {
            setTitle('');
            setKeywordsInput('');
            setApiError('');
            onClose();
          },
          onError: (error) => {
            setApiError(error instanceof Error ? error.message : 'Failed to create persona');
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setTitle('');
    setKeywordsInput('');
    setTitleError('');
    setApiError('');
    onClose();
  };

  const isPending = createPersona.isPending || updatePersona.isPending;

  const footer = (
    <>
      <EnhancedButton label="Cancel" colorTheme="secondary" onClick={handleCancel} />
      <EnhancedButton
        label={isEditMode ? 'Save' : 'Create'}
        colorTheme="primary"
        onClick={handleSave}
        disabled={isPending}
      />
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      headerTitle={isEditMode ? 'Edit Persona' : 'Create Persona'}
      footer={footer}
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '450px', minWidth: '400px' } },
        },
      }}
    >
      <EnhancedTextField
        label="Title"
        placeholder="Enter persona title"
        value={title}
        onChange={handleTitleChange}
        variant={titleError ? 'error' : 'default'}
        helperText={titleError}
      />
      <EnhancedTextField
        label="Keywords"
        placeholder="Enter keywords separated by commas"
        value={keywordsInput}
        onChange={handleKeywordsChange}
        helperText="Separate keywords with commas (e.g., JavaScript, React, Node.js)"
      />
      {apiError && <p className={styles.apiError}>{apiError}</p>}
    </Modal>
  );
}
