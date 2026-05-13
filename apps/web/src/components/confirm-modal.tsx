import { Modal, EnhancedButton } from '@repo/ui';
import { CircularProgress } from '@mui/material';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const footer = (
    <>
      <EnhancedButton
        label={cancelLabel}
        colorTheme="secondary"
        onClick={onCancel}
        disabled={isLoading}
      />
      <EnhancedButton
        label={confirmLabel}
        colorTheme="negativeSecondary"
        onClick={onConfirm}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={'1rem'} color="inherit" /> : undefined}
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
      <p style={{ color: 'var(--white-700)', margin: 0 }}>{message}</p>
    </Modal>
  );
}
