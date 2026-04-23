import { Modal, EnhancedButton } from '@repo/ui';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const footer = (
    <>
      <EnhancedButton label={cancelLabel} colorTheme="secondary" onClick={onCancel} />
      <EnhancedButton label={confirmLabel} colorTheme="negativeSecondary" onClick={onConfirm} />
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
