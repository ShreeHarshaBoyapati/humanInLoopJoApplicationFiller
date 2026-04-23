import { ConfirmModal } from './confirm-modal';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ isOpen, onConfirm, onCancel }: LogoutConfirmModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Logout"
      message="Do you want to logout?"
      confirmLabel="Yes"
      cancelLabel="No"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
