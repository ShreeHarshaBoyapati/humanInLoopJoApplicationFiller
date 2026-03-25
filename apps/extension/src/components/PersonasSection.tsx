import { useEffect, useState, useCallback, useMemo } from 'react';
import styles from '../routes/style/settings.module.css';
import { EnhancedButton, EnhancedTextField } from '@repo/ui';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import styleConstants from '@repo/ui/constants/style-constants.js';
import type { Persona } from '@repo/shared-types';

const INITIAL_VISIBLE_COUNT = 2;

type ConnectionStatus = { type: 'success' | 'error'; text: string } | null;

export function PersonasSection() {
  const [isAddingPersona, setIsAddingPersona] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [saveStatus, setSaveStatus] = useState<ConnectionStatus>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLoading, setActiveLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort personas to ensure active one is always first in the visible list
  const sortedPersonas = useMemo(() => {
    return [...personas].sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return 0;
    });
  }, [personas]);

  const visiblePersonas = isExpanded
    ? sortedPersonas
    : sortedPersonas.slice(0, INITIAL_VISIBLE_COUNT);

  const fetchPersonas = useCallback(() => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_PERSONAS' },
        (res: { success: boolean; data?: Persona[]; error?: string }) => {
          setLoading(false);
          if (res?.success && res.data) {
            setPersonas(res.data);
          }
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const handleSave = () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);

    const payload = editingId
      ? {
          id: editingId,
          title: name,
          keywords: keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        }
      : {
          title: name,
          keywords: keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        };

    const action = editingId ? 'UPDATE_PERSONA' : 'CREATE_PERSONA';

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action, payload },
        (res: { success: boolean; data?: Persona; error?: string }) => {
          setIsSaving(false);
          if (res?.success && res.data) {
            resetForm();
            if (editingId) {
              setPersonas((prev) => prev.map((p) => (p.id === res.data!.id ? res.data! : p)));
            } else {
              setPersonas((prev) => [res.data!, ...prev]);
            }
          } else {
            setSaveStatus({ type: 'error', text: res?.error || 'Failed to save persona' });
          }
        }
      );
    } else {
      setIsSaving(false);
      setSaveStatus({ type: 'error', text: 'Chrome runtime not available' });
    }
  };

  const resetForm = () => {
    setName('');
    setKeywords('');
    setSaveStatus(null);
    setIsAddingPersona(false);
    setEditingId(null);
  };

  const handleSelect = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setActiveLoading(true);
      chrome.runtime.sendMessage(
        { action: 'SELECT_PERSONA', payload: { id } },
        (res: { success: boolean; message?: string }) => {
          if (res?.success) {
            // Update local state to reflect the active persona
            setPersonas((prevPersonas) =>
              prevPersonas.map((p) => ({
                ...p,
                active: p.id === id,
              }))
            );
          }
          setActiveLoading(false);
        }
      );
    }
  };

  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  const onEdit = (persona: Persona) => {
    setIsAddingPersona(true);
    setEditingId(persona.id);
    setName(persona.title);
    setKeywords(persona.keywords?.join(', ') || '');
    setSaveStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'DELETE_PERSONA', payload: { id } },
        (res: { success: boolean; error?: string }) => {
          if (res?.success) {
            setPersonas((prev) => prev.filter((p) => p.id !== id));
          }
        }
      );
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>PERSONAS</span>
        </div>
        <div className={styles.providerList} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
          <span className={styles.usageText}>Loading personas...</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>PERSONAS</span>
        <EnhancedButton
          colorTheme="tertiary"
          size="small"
          label="Add New"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setIsAddingPersona(true)}
        />
      </div>

      {isAddingPersona && (
        <div className={styles.card}>
          <div className={styles.addProviderForm}>
            <div className={`${styles.formField}`}>
              <EnhancedTextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={'Enter persona name'}
              />
            </div>
            <div className={`${styles.formField}`}>
              <EnhancedTextField
                label="Keywords (comma-separated)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={'e.g. React, TypeScript, Node.js'}
              />
            </div>
          </div>
          <div className={styles.footer}>
            {/* Save status */}
            {saveStatus && (
              <div
                className={`${styles.connectionResult} ${
                  saveStatus.type === 'success' ? styles.connectionSuccess : styles.connectionError
                }`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircleIcon fontSize="small" />
                ) : (
                  <ErrorOutlineIcon fontSize="small" />
                )}
                <span>{saveStatus.text}</span>
              </div>
            )}

            {/* Actions */}
            <div className={styles.formActions}>
              <EnhancedButton
                label={isSaving ? 'Saving…' : editingId ? 'Update' : 'Save'}
                colorTheme="primary"
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
              />
              <EnhancedButton colorTheme="secondary" onClick={resetForm} label="Cancel" />
            </div>
          </div>
        </div>
      )}

      <span className={styles.sectionHeading} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        CONFIGURED PERSONAS
      </span>

      {personas.length === 0 ? (
        <div className={styles.providerList} style={{ marginTop: 0 }}>
          <span className={styles.usageText}>No personas configured yet.</span>
        </div>
      ) : (
        <div className={styles.providerList} style={{ marginTop: 0 }}>
          {visiblePersonas.map((p) => (
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
                <div className={styles.providerDetails}>
                  <div className={styles.providerNameRow}>
                    <span className={styles.providerName}>{formatName(p.title)}</span>
                    {p.active && <span className={styles.activeTag}>ACTIVE</span>}
                  </div>
                  <span className={styles.usageText}>
                    {p.keywords?.join(', ') || 'No keywords'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={styles.settingsBtn}
                  aria-label="Edit persona"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(p);
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </button>
                <button
                  className={styles.settingsBtn}
                  aria-label="Delete persona"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
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
      )}

      {personas.length > INITIAL_VISIBLE_COUNT && (
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
    </section>
  );
}
