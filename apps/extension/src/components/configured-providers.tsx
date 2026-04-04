import { useEffect, useState, useCallback, useMemo } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import styles from '../routes/style/settings.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import { EnhancedButton } from '@repo/ui';

const INITIAL_VISIBLE_COUNT = 2;

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort providers to ensure active one is always first in the visible list
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return 0;
    });
  }, [providers]);

  const visibleProviders = isExpanded
    ? sortedProviders
    : sortedProviders.slice(0, INITIAL_VISIBLE_COUNT);

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

  const handleSelect = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setActiveLoading(true);
      chrome.runtime.sendMessage(
        { action: 'SELECT_PROVIDER', payload: { id } },
        (res: { success: boolean; message?: string }) => {
          setActiveLoading(false);
          if (res?.success) {
            // Update local state to reflect the active provider
            setProviders((prevProviders) =>
              prevProviders.map((p) => ({
                ...p,
                active: p.id === id,
              }))
            );
          }
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
      <span className={styles.sectionHeading} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        CONFIGURED PROVIDERS
      </span>

      <div className={styles.providerList} style={{ marginTop: 0 }}>
        {visibleProviders.map((p) => (
          <div
            key={p.id}
            className={`${styles.providerItem} ${activeLoading ? styles.providerItemDisabled : ''} ${p.active ? styles.selectedProviderItem : ''}`}
            onClick={() => {
              if (!p.active) {
                handleSelect(p.id);
              }
            }}
          >
            <div className={styles.providerInfo}>
              <div
                className={`${styles.providerIcon} ${!p.active ? styles.providerIconInactive : ''}`}
              >
                {getProviderIcon(p.provider)}
              </div>
              <div className={styles.providerDetails}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>{formatName(p.provider)}</span>
                  {p.active && <span className={styles.activeTag}>ACTIVE</span>}
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

      {providers.length > INITIAL_VISIBLE_COUNT && (
        <div className={styles.buttonContainer}>
          <EnhancedButton
            colorTheme="text"
            label={isExpanded ? 'View Less' : 'View More'}
            size="small"
            endIcon={
              isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />
            }
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>
      )}
    </>
  );
}
