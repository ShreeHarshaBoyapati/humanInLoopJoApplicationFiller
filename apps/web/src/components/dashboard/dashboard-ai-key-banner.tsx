/**
 * AI key banner.
 * Shown only when the user has not configured an AI provider key.
 */

import { ErrorOutline } from '@mui/icons-material';
import styles from './style/dashboard-ai-key-banner.module.css';

interface DashboardAiKeyBannerProps {
  onConfigure: () => void;
}

export const DashboardAiKeyBanner = ({ onConfigure }: DashboardAiKeyBannerProps) => {
  return (
    <div className={styles.banner}>
      <div className={styles.message}>
        <ErrorOutline className={styles.icon} />
        <span>AI key not configured — ATS scoring is disabled</span>
      </div>
      <button type="button" className={styles.link} onClick={onConfigure}>
        Configure in settings →
      </button>
    </div>
  );
};
