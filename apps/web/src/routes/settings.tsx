/**
 * Settings route placeholder.
 * Currently hosts the AI Configuration section so the onboarding CTA has a target.
 * Replace with the real settings layout once it is implemented.
 */

import { createFileRoute } from '@tanstack/react-router';
import styles from './style/settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>AI Configuration</h1>
      <p className={styles.description}>
        Configure your AI provider API key here. This page will be expanded into the full settings
        layout.
      </p>
    </div>
  );
}
