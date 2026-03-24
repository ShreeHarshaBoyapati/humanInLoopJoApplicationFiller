import { useEffect, useState, useCallback } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import styles from '../routes/style/settings.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';

interface ProviderData {
  id: string;
  provider: string;
  model: string;
  credentials: Record<string, string>;
  active: boolean;
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
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState('');

  const fetchProviders = useCallback(() => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_CONFIGURED_PROVIDERS' },
        (res: { success: boolean; data?: ProviderData[]; error?: string }) => {
          setLoading(false);
          if (res?.success && res.data) {
            for (const obj of res.data) {
              if (obj.active) {
                setActiveIndex(obj.id);
              }
            }
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

  const handleSelect = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setActiveLoading(true);
      chrome.runtime.sendMessage(
        { action: 'SELECT_PROVIDER', payload: { id } },
        (res: { success: boolean; message?: string }) => {
          if (res?.success) {
            setActiveIndex(id);
          }
          setActiveLoading(false);
        }
      );
    }
  };

  const getProviderIcon = (providerName: string) => {
    return providerName.charAt(0).toUpperCase();
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
        {providers.map((p) => (
          <div
            key={p.id}
            className={`${styles.providerItem} ${activeLoading ? styles.providerItemDisabled : ''}`}
            onClick={() => {
              if (activeIndex != p.id) {
                handleSelect(p.id);
              }
            }}
          >
            <div className={styles.providerInfo}>
              <div
                className={`${styles.providerIcon} ${activeIndex != p.id ? styles.providerIconInactive : ''}`}
              >
                {getProviderIcon(p.provider)}
              </div>
              <div className={styles.providerDetails}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>{formatName(p.provider)}</span>
                  {activeIndex == p.id && <span className={styles.activeTag}>ACTIVE</span>}
                </div>
                <span className={styles.usageText}>Model: {p.model}</span>
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
                style={{
                  color: styleConstants.red700,
                }}
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
