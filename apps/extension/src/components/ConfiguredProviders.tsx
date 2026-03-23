import { useEffect, useState, useCallback } from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import styles from '../routes/style/settings.module.css';

interface ProviderData {
  id: string;
  provider: string;
  model: string;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface ConfiguredProvidersProps {
  onEdit?: (provider: ProviderData) => void;
  refreshTrigger?: number;
}

export function ConfiguredProviders({ onEdit, refreshTrigger = 0 }: ConfiguredProvidersProps) {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(() => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_CONFIGURED_PROVIDERS' },
        (res: { success: boolean; data?: ProviderData[]; error?: string }) => {
          setLoading(false);
          if (res?.success && res.data) {
            setProviders(res.data);
          }
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders, refreshTrigger]);

  const handleDelete = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'DELETE_PROVIDER', payload: { id } },
        (res: { success: boolean; error?: string }) => {
          if (res?.success) {
            fetchProviders();
          }
        }
      );
    }
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName) {
      case 'openai':
        return <SmartToyOutlinedIcon />;
      case 'gemini':
        return <AutoAwesomeIcon />;
      case 'anthropic':
        return <PsychologyOutlinedIcon />;
      case 'mistral':
        return <CloudOutlinedIcon />;
      case 'groq':
        return <BoltOutlinedIcon />;
      case 'ollama':
        return <MemoryOutlinedIcon />;
      default:
        return <SettingsInputComponentOutlinedIcon />;
    }
  };

  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  if (loading) {
    return (
      <div className={styles.providerList} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        <span className={styles.usageText}>Loading configured providers...</span>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className={styles.providerList} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        <span className={styles.usageText}>No providers configured yet.</span>
      </div>
    );
  }

  return (
    <>
      <span className={styles.fieldLabel} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        CONFIGURED PROVIDERS
      </span>

      <div className={styles.providerList} style={{ marginTop: 0 }}>
        {providers.map((p, idx) => (
          <div key={p.id} className={styles.providerItem}>
            <div className={styles.providerInfo}>
              <div
                className={`${styles.providerIcon} ${idx !== 0 ? styles.providerIconInactive : ''}`}
              >
                {getProviderIcon(p.provider)}
              </div>
              <div className={styles.providerDetails}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>{formatName(p.provider)}</span>
                  {idx === 0 && <span className={styles.activeTag}>ACTIVE</span>}
                </div>
                <span className={styles.usageText}>Model: {p.model}</span>
                <span
                  className={styles.usageText}
                  style={{ fontSize: '0.7rem', color: 'var(--white-700)' }}
                >
                  Placeholder: 0 tokens used
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={styles.settingsBtn}
                aria-label="Edit provider"
                onClick={() => onEdit?.(p)}
              >
                <EditOutlinedIcon fontSize="small" />
              </button>
              <button
                className={styles.settingsBtn}
                aria-label="Delete provider"
                onClick={() => handleDelete(p.id)}
                style={{ color: '#ef4444' }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
