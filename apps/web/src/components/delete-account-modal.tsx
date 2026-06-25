import { useState } from 'react';
import { Modal, EnhancedButton, EnhancedTextField } from '@repo/ui';
import { useDeleteAccount } from '../hooks/use-delete-account';
import { useStore } from '../store';
import styles from './style/delete-account-modal.module.css';
import { resetAuthOnUserDeleted } from '../utils/auth-sync';
import { useNavigate } from '@tanstack/react-router';
import { queryClient } from '../utils/query-client';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

/**
 * Confirmation modal for account deletion. Requires the user to type their
 * email before enabling the destructive action.
 */
export function DeleteAccountModal({ isOpen, onClose, email }: DeleteAccountModalProps) {
  const showSnackbar = useStore((state) => state.showSnackbar);
  const [confirmEmail, setConfirmEmail] = useState('');
  const deleteAccount = useDeleteAccount();
  const navigate = useNavigate();

  const canDelete =
    email.trim().length > 0 && confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();

  const handleConfirm = () => {
    if (!canDelete) return;

    deleteAccount
      .mutateAsync(undefined)
      .then(() => {
        resetAuthOnUserDeleted({
          clearUser: () => useStore.getState().clearUser(),
          clearQueryCache: () => queryClient.clear(),
          showSnackbar: (message, options) => useStore.getState().showSnackbar(message, options),
          navigateToLogin: () => {
            navigate({ to: '/login' });
          },
        });

        showSnackbar('Account deleted', { severity: 'success' });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to delete account';
        showSnackbar(message, { severity: 'error' });
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      headerTitle="Delete Account"
      customProps={{
        childProps: {
          body: { className: styles.body },
        },
      }}
      footer={
        <>
          <EnhancedButton label="Cancel" colorTheme="secondary" onClick={onClose} />
          <EnhancedButton
            label="Delete Account"
            colorTheme="negativeSecondary"
            onClick={handleConfirm}
            disabled={!canDelete || deleteAccount.isPending}
            customProps={{ props: { sx: { width: 'fit-content', minWidth: 'fit-content' } } }}
          />
        </>
      }
    >
      <p className={styles.message}>
        This will permanently delete your account, jobs, resumes, and AI configurations.
      </p>
      <p className={styles.prompt}>Type your email to confirm:</p>
      <EnhancedTextField
        value={confirmEmail}
        onChange={(e) => setConfirmEmail(e.target.value)}
        placeholder={email}
        testId="delete-account-email"
      />
    </Modal>
  );
}
