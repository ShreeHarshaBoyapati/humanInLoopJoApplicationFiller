/**
 * Provider card — read-only display of one configured AI provider. The active
 * provider is selected only by clicking the radio button. Credentials are shown
 * in a compact block below the provider name/model.
 */

import { Radio } from '@mui/material';
import type { ApiKeyData } from '@repo/shared-types';

import { ProviderCredentialRow } from './provider-credential-row';
import styles from './style/provider-card.module.css';

interface ProviderCardProps {
  provider: ApiKeyData;
  isSettingActive: boolean;
  onSetActive: (id: string) => void;
}

const CREDENTIAL_LABELS: Record<string, string> = {
  apiKey: 'API Key',
  customUrl: 'API Base URL',
  organizationId: 'Organization ID',
  projectId: 'Project ID',
};

export function ProviderCard({ provider, isSettingActive, onSetActive }: ProviderCardProps) {
  const isActive = provider.active;
  const isDisabled = isSettingActive || isActive;
  const providerName =
    (provider.provider || '').charAt(0).toUpperCase() + provider.provider.slice(1);
  const model = provider.model || '';

  const handleRadioChange = () => {
    if (!isActive && !isSettingActive) {
      onSetActive(provider.id);
    }
  };

  return (
    <div className={`${styles.providerCard} ${isActive ? styles.activeCard : ''}`}>
      <div className={styles.leadingBlock}>
        <div className={styles.radioSection}>
          <Radio
            checked={isActive}
            disabled={isDisabled}
            onChange={handleRadioChange}
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-disabled': {
                color: isActive ? 'var(--blue-500)' : 'var(--grey-500)',
                pointerEvents: 'none',
              },
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </div>
      </div>

      <div className={styles.mainBlock}>
        <div className={styles.nameBlock}>
          <p className={styles.providerName}>{providerName}</p>
          {model && <p className={styles.modelLine}>Model: {model}</p>}
        </div>

        <div className={styles.credentialsBlock}>
          {Object.entries(provider.credentials).map(([key, value]) => (
            <ProviderCredentialRow key={key} label={CREDENTIAL_LABELS[key] || key} value={value} />
          ))}
        </div>
      </div>
    </div>
  );
}
