import { Modal, EnhancedButton } from '@repo/ui';
import { CircularProgress } from '@mui/material';
import styles from './style/confirm-modal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  cancellation?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  isLoading = false,
  cancellation = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const footer = (
    <>
      <EnhancedButton
        label={cancelLabel}
        colorTheme="secondary"
        onClick={onCancel}
        disabled={!cancellation && isLoading}
      />
      <EnhancedButton
        label={confirmLabel}
        colorTheme="negativeSecondary"
        onClick={onConfirm}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size="1rem" color="inherit" /> : undefined}
      />
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      headerTitle={title}
      footer={footer}
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '400px', minWidth: '300px' } },
        },
      }}
    >
      <p className={styles.message}>{message}</p>
    </Modal>
  );
}

export default ConfirmModal;
