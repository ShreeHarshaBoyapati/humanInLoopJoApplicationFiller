/**
 * Shared empty-state helper for dashboard widgets.
 * Shows a short explanation and an optional CTA when a widget has no data.
 */

import { EnhancedButton } from '@repo/ui';
import styles from './style/dashboard-empty-state.module.css';

interface DashboardEmptyStateProps {
  message: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export const DashboardEmptyState = ({
  message,
  ctaLabel,
  onCtaClick,
}: DashboardEmptyStateProps) => {
  return (
    <div className={styles.empty}>
      <p className={styles.message}>{message}</p>
      {ctaLabel && onCtaClick && (
        <EnhancedButton label={ctaLabel} colorTheme="primary" onClick={onCtaClick} size="small" />
      )}
    </div>
  );
};
