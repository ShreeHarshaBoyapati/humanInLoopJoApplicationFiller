import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { EnhancedButton, EnhancedSelectDropdown } from '@repo/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AddIcon from '@mui/icons-material/Add';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect } from 'react';
import styles from './style/settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

function SettingsComponent() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState<string>('gemini');
  const [model, setModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const providerOptions = [
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Gemini', value: 'gemini' },
  ];

  useEffect(() => {
    setModel('');
    setModelOptions([]);
    setStatusMsg(null);
  }, [provider]);

  useEffect(() => {
    if (!apiKey || apiKey.length < 5) {
      setModelOptions([]);
      return;
    }
    const fetchModels = async () => {
      setLoadingModels(true);
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: 'AI_MODELS', payload: { providerName: provider, apiKey } },
          (res: any) => {
            setLoadingModels(false);
            if (res?.success && res.data?.models) {
              setModelOptions(res.data.models);
              if (res.data.models.length > 0) {
                setModel(res.data.models[0].value);
              }
            }
          }
        );
      }
    };
    const timeoutId = setTimeout(fetchModels, 500);
    return () => clearTimeout(timeoutId);
  }, [provider, apiKey]);

  const handleTestConnection = () => {
    if (!provider || !apiKey || !model) {
      setStatusMsg({ type: 'error', text: 'Provider, Model, and API Key are required' });
      return;
    }
    setStatusMsg(null);
    setIsTesting(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'AI_TEST_CONNECTION', payload: { providerName: provider, apiKey, model } },
        (res: any) => {
          setIsTesting(false);
          if (res?.success) {
            setStatusMsg({ type: 'success', text: 'Connection successful!' });
          } else {
            setStatusMsg({ type: 'error', text: res?.error || 'Connection failed' });
          }
        }
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate({ to: '/' })}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </button>
        <h1 className={styles.headerTitle}>Settings</h1>
      </div>

      {/* Account Details */}
      <div className={styles.aiStatusArea}>
        <h3 className={styles.sectionHeading}>ACCOUNT DETAILS</h3>
        <div className={styles.aiStatusCard}>
          <div className={styles.aiStatusLabels}>
            <span className={styles.aiStatusTitle}>Alex Rivers</span>
            <span className={styles.aiStatusValue}>alex.rivers@vitest.dev</span>
          </div>
        </div>
      </div>

      {/* Personas Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>PERSONAS</span>
          <span className={styles.sectionMeta}>3 Total</span>
        </div>

        {/* Active Persona */}
        <div className={`${styles.card} ${styles.activeCard}`}>
          <div className={styles.personaHeader}>
            <div className={styles.personaTitleWrapper}>
              <span className={styles.personaTitle}>Frontend Engineer</span>
              <span className={styles.activeBadgeText}>Active Persona</span>
            </div>
            <CheckCircleOutlineIcon className={styles.checkIcon} />
          </div>
          <p className={styles.personaSnippet}>React, Tailwind, Vitest expert</p>
          <EnhancedButton
            label="View Resumes"
            colorTheme="primary"
            style={{ width: '100%', padding: 'calc(var(--spacing) * 3)' }}
          />
        </div>

        {/* Inactive Persona */}
        <div className={styles.card}>
          <div className={styles.personaHeader}>
            <div className={styles.personaTitleWrapper}>
              <span className={styles.personaTitle}>Backend Developer</span>
            </div>
            <button className={styles.switchBtn}>Switch</button>
          </div>
          <p className={styles.personaSnippet} style={{ marginBottom: 0 }}>
            Node.js, PostgreSQL, Redis
          </p>
        </div>

        <button className={styles.viewMoreBtn}>
          <span>View More</span>
          <ExpandMoreIcon fontSize="small" />
        </button>
      </section>

      {/* AI Providers Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>AI PROVIDERS</span>
          <button className={styles.addButton}>
            <AddIcon fontSize="small" /> Add New
          </button>
        </div>

        {/* Add Provider Form (Card) */}
        <div className={styles.card}>
          <div className={styles.addProviderForm}>
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>AI PROVIDER</span>
              <EnhancedSelectDropdown
                testId="provider-select"
                options={providerOptions}
                value={provider}
                onChange={(e) => setProvider(e.target.value as string)}
              />
            </div>

            <div className={styles.formField}>
              <span className={styles.fieldLabel}>MODEL SELECTION</span>
              <EnhancedSelectDropdown
                testId="model-select"
                options={
                  modelOptions.length > 0
                    ? modelOptions
                    : [{ label: 'Enter API Key to load models', value: '' }]
                }
                value={model}
                onChange={(e) => setModel(e.target.value as string)}
                disabled={loadingModels || modelOptions.length === 0}
              />
            </div>

            <div className={styles.formField}>
              <span className={styles.fieldLabel}>API KEY</span>
              <div className={styles.inputWrapper}>
                <input
                  type="password"
                  className={styles.inputBox}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key to load models"
                />
                <button className={styles.visibilityBtn} aria-label="Toggle password visibility">
                  <VisibilityOffOutlinedIcon fontSize="small" />
                </button>
              </div>
            </div>

            {statusMsg && (
              <div
                style={{
                  color:
                    statusMsg.type === 'error'
                      ? 'var(--error-500, #ff4d4f)'
                      : 'var(--success-500, #52c41a)',
                  marginBottom: '1rem',
                  fontSize: '14px',
                }}
              >
                {statusMsg.text}
              </div>
            )}

            <div className={styles.formActions}>
              <EnhancedButton
                label="Save Provider"
                colorTheme="primary"
                style={{ width: '100%' }}
              />
              <div className={styles.secondaryActions}>
                <button className={styles.cancelBtn}>Cancel</button>
                <button
                  className={styles.testBtn}
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey || !model}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configured Providers text label visually */}
        <span className={styles.fieldLabel} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
          CONFIGURED PROVIDERS
        </span>

        {/* Providers List */}
        <div className={styles.providerList} style={{ marginTop: 0 }}>
          {/* Default/Active */}
          <div className={styles.providerItem}>
            <div className={styles.providerInfo}>
              <div className={styles.providerIcon}>
                <SmartToyOutlinedIcon />
              </div>
              <div className={styles.providerDetails}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>OpenAI</span>
                  <span className={styles.activeTag}>ACTIVE</span>
                </div>
                <span className={styles.usageText}>1.2M / 5M tokens used</span>
              </div>
            </div>
            <button className={styles.settingsBtn} aria-label="Provider settings">
              <SettingsOutlinedIcon />
            </button>
          </div>

          {/* Inactive */}
          <div className={styles.providerItem}>
            <div className={styles.providerInfo}>
              <div className={`${styles.providerIcon} ${styles.providerIconInactive}`}>
                <AutoAwesomeIcon />
              </div>
              <div className={styles.providerDetails}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>Anthropic</span>
                </div>
                <span className={styles.usageText}>Claude 3.5 Sonnet</span>
              </div>
            </div>
            <button className={styles.settingsBtn} aria-label="Provider settings">
              <SettingsOutlinedIcon />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
