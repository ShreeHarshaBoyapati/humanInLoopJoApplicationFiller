import styles from './style/logout-confirm-modal.module.css';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ isOpen, onConfirm, onCancel }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Logout</h2>
        <p className={styles.message}>Do you want to logout?</p>
        <div className={styles.buttonContainer}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            No
          </button>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
