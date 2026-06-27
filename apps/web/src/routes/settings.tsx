/**
 * Settings route — renders the three settings sections (account, AI providers,
 * delete account) inside a single column.
 */

import { createFileRoute } from '@tanstack/react-router';
import { AccountDetailSection } from '../components/account-detail-section';
import { ApiConfigurationSection } from '../components/api-configuration-section';
import { DeleteAccountSection } from '../components/delete-account-section';
import styles from './style/settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>
      <AccountDetailSection />
      <ApiConfigurationSection />
      <DeleteAccountSection />
    </div>
  );
}
