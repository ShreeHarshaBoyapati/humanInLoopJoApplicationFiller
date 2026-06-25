import { useState } from 'react';
import { EnhancedButton } from '@repo/ui';
import { useStore } from '../store';
import { DeleteAccountModal } from './delete-account-modal';
import styles from './style/delete-account-section.module.css';

/**
 * Delete account section — triggers a confirmation modal;
 * account deletion is irreversible.
 */
export function DeleteAccountSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const email = useStore((state) => state.email) || '';

  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p className={styles.warning}>
          This will permanently delete your account, jobs, resumes, and AI configurations.
        </p>
        <EnhancedButton
          label="Delete Account"
          colorTheme="negativeSecondary"
          onClick={() => setIsModalOpen(true)}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
      </div>
      <DeleteAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        email={email}
      />
    </section>
  );
}
