import { useState } from 'react';
import { EnhancedButton, EnhancedSelectDropdown, EnhancedTextField } from '@repo/ui';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ConfiguredProviders } from './ConfiguredProviders';
import styles from '../routes/style/settings.module.css';

type ConnectionStatus = { type: 'success' | 'error'; text: string } | null;

export function AiProvidersSection() {
  const [isAddingProvider, setIsAddingProvider] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Step 1 — Provider
  const [provider, setProvider] = useState<string>('gemini');

  // Step 2 — Authentication Credentials
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<boolean>(false);

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    if (connectionStatus) setConnectionStatus(null);
  };

  // Step 3 — Test connection
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);

  // Step 4 — Model
  const [model, setModel] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);

  // Save
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<ConnectionStatus>(null);

  // Computed step enables
  const step2Enabled = provider.length > 0;

  const isCredentialValid = () => {
    if (provider === 'custom') {
      return (
        (credentials.apiKey || '').trim().length > 0 &&
        (credentials.customUrl || '').trim().length > 0
      );
    }
    if (provider === 'ollama') {
      return true;
    }
    return (credentials.apiKey || '').trim().length > 0;
  };

  const step3Enabled = step2Enabled && isCredentialValid();
  const step4Enabled = step3Enabled && connectionStatus?.type === 'success';

  const providerOptions = [
    { label: 'Gemini', value: 'gemini' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Groq', value: 'groq' },
    { label: 'Mistral', value: 'mistral' },
    { label: 'Ollama', value: 'ollama' },
    { label: 'Custom (Open AI Supported)', value: 'custom' },
  ];

  const resetForm = () => {
    setProvider('gemini');
    setCredentials({});
    setShowKey(false);
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);
    setSaveStatus(null);
    setIsAddingProvider(false);
    setEditingId(null);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    // Reset downstream state on provider change
    setCredentials({});
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);
    setSaveStatus(null);
  };

  const handleEditProvider = (providerData: {
    id: string;
    provider: string;
    credentials: Record<string, string>;
    model: string;
  }) => {
    setIsAddingProvider(true);
    setEditingId(providerData.id);
    setProvider(providerData.provider);
    setCredentials(providerData.credentials || {});
    setModel(providerData.model);
    setModelOptions([{ label: providerData.model, value: providerData.model }]);
    setConnectionStatus(null);
    setSaveStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const triggerTest = (creds: Record<string, string>) => {
      setIsTesting(true);
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          {
            action: 'TEST_CONNECTION',
            payload: { providerName: providerData.provider, credentials: creds },
          },
          (testRes: {
            success: boolean;
            message?: string;
            error?: string;
            data?: { models: { label: string; value: string }[] };
          }) => {
            setIsTesting(false);
            if (testRes?.success) {
              setConnectionStatus({ type: 'success', text: 'Connection successful!' });
              if (testRes.data?.models) {
                setModelOptions(testRes.data.models);
                const modelExists = testRes.data.models.some((m) => m.value === providerData.model);
                if (!modelExists && testRes.data.models.length > 0 && testRes.data.models[0]) {
                  setModel(testRes.data.models[0].value);
                }
              }
            } else {
              setConnectionStatus({ type: 'error', text: testRes?.error || 'Connection failed' });
            }
          }
        );
      }
    };

    if (providerData.credentials?.apiKey && typeof chrome !== 'undefined' && chrome.runtime) {
      setIsTesting(true);
      chrome.runtime.sendMessage(
        { action: 'DECRYPT_API_KEY', payload: { encryptedKey: providerData.credentials.apiKey } },
        (decryptRes: { success: boolean; data?: { decryptedKey: string }; message?: string }) => {
          if (decryptRes?.success && decryptRes.data?.decryptedKey) {
            const decryptedKey = decryptRes.data.decryptedKey;
            const updatedCredentials = { ...providerData.credentials, apiKey: decryptedKey };
            setCredentials(updatedCredentials);
            triggerTest(updatedCredentials);
          } else {
            console.error('Failed to decrypt API key:', decryptRes?.message);
            triggerTest(providerData.credentials);
          }
        }
      );
    } else {
      triggerTest(providerData.credentials || {});
    }
  };

  const handleTestConnection = () => {
    if (!step3Enabled) return;
    setIsTesting(true);
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: 'TEST_CONNECTION',
          payload: { providerName: provider, credentials },
        },
        (res: {
          success: boolean;
          message?: string;
          error?: string;
          data?: { models: { label: string; value: string }[] };
        }) => {
          setIsTesting(false);
          if (res?.success) {
            setConnectionStatus({ type: 'success', text: 'Connection successful!' });
            // Auto-populate models from test connection response
            if (res.data?.models) {
              setModelOptions(res.data.models);
              if (res.data.models.length > 0 && res.data.models[0]) {
                setModel(res.data.models[0].value);
              }
            }
          } else {
            setConnectionStatus({ type: 'error', text: res?.error || 'Connection failed' });
          }
        }
      );
    } else {
      setIsTesting(false);
      setConnectionStatus({ type: 'error', text: 'Chrome runtime not available' });
    }
  };

  const handleSave = () => {
    if (!step4Enabled || !model) return;
    setIsSaving(true);
    setSaveStatus(null);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: 'SAVE_PROVIDER',
          payload: { id: editingId || undefined, providerName: provider, credentials, model },
        },
        (res: { success: boolean; error?: string }) => {
          setIsSaving(false);
          if (res?.success) {
            setSaveStatus({ type: 'success', text: 'Provider saved successfully!' });
            resetForm();
            setRefreshKey((k) => k + 1); // trigger ConfiguredProviders reload
          } else {
            setSaveStatus({ type: 'error', text: res?.error || 'Failed to save provider' });
          }
        }
      );
    } else {
      setIsSaving(false);
      setSaveStatus({ type: 'error', text: 'Chrome runtime not available' });
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>AI PROVIDERS</span>
        <EnhancedButton
          colorTheme="tertiary"
          size="small"
          label="Add New"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setIsAddingProvider(true)}
        />
      </div>

      {/* Add Provider Wizard Card */}
      {isAddingProvider && (
        <div className={styles.card}>
          <div className={styles.addProviderForm}>
            {/* ── Step 1: Select Provider ── */}
            <div className={styles.formField}>
              <EnhancedSelectDropdown
                label="AI Provider"
                testId="provider-select"
                options={providerOptions}
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as string)}
              />
            </div>

            {/* ── Dynamic Authentication Fields ── */}
            {(provider === 'custom' || provider === 'ollama') && (
              <div className={styles.formField}>
                <EnhancedTextField
                  label={`API Base URL ${provider === 'ollama' ? '(Optional)' : '(Required)'}`}
                  value={credentials.customUrl || ''}
                  onChange={(e) => handleCredentialChange('customUrl', e.target.value)}
                  placeholder={
                    provider === 'ollama'
                      ? 'e.g. http://localhost:11434'
                      : 'e.g. https://api.yourprovider.com/v1'
                  }
                  disabled={!step2Enabled}
                  variant={'default'}
                />
              </div>
            )}

            {provider === 'openai' && (
              <>
                <div className={styles.formField}>
                  <EnhancedTextField
                    label="ORGANIZATION ID (Optional)"
                    value={credentials.organizationId || ''}
                    onChange={(e) => handleCredentialChange('organizationId', e.target.value)}
                    placeholder="organization Id"
                    disabled={!step2Enabled}
                    variant={'default'}
                  />
                </div>
                <div className={styles.formField}>
                  <EnhancedTextField
                    label="Project ID (Optional)"
                    value={credentials.projectId || ''}
                    onChange={(e) => handleCredentialChange('projectId', e.target.value)}
                    placeholder="project Id for organization"
                    disabled={!step2Enabled}
                    variant={'default'}
                  />
                </div>
              </>
            )}

            {/* ── Step 2: Enter API Key ── */}
            <div className={`${styles.formField}`}>
              <EnhancedTextField
                label="API Key"
                value={credentials.apiKey || ''}
                onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                placeholder={'Enter your API key'}
                disabled={!step2Enabled}
                variant={showKey ? 'default' : 'default'}
              />
            </div>

            <div className={styles.rowDivider}></div>

            {/* ── Step 3: Test Connection ── */}
            <div className={`${styles.formField}`}>
              <div className={styles.testConnectionRow}>
                <EnhancedButton
                  colorTheme="tertiary"
                  className={styles.testBtn}
                  onClick={handleTestConnection}
                  disabled={!step3Enabled || isTesting}
                  label={isTesting ? 'Testing…' : 'Test Connection'}
                  size="medium"
                  customProps={{ props: { sx: { width: '100%', maxWidth: '100%' } } }}
                />

                {connectionStatus && (
                  <div
                    className={`${styles.connectionResult} ${
                      connectionStatus.type === 'success'
                        ? styles.connectionSuccess
                        : styles.connectionError
                    }`}
                  >
                    {connectionStatus.type === 'success' ? (
                      <CheckCircleIcon fontSize="small" />
                    ) : (
                      <ErrorOutlineIcon fontSize="small" />
                    )}
                    <span>{connectionStatus.text}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.rowDivider}></div>

            {/* ── Step 4: Select Model + Save ── */}
            <div className={`${styles.formField}`}>
              <EnhancedSelectDropdown
                label="Model Selection"
                testId="model-select"
                options={
                  modelOptions.length > 0
                    ? modelOptions
                    : [{ label: 'Test connection to load models', value: '' }]
                }
                value={model}
                onChange={(e) => setModel(e.target.value as string)}
                disabled={!step4Enabled || modelOptions.length === 0}
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
                label={isSaving ? 'Saving…' : 'Save'}
                colorTheme="primary"
                onClick={handleSave}
                disabled={!step4Enabled || !model || isSaving}
              />
              <EnhancedButton colorTheme="secondary" onClick={resetForm} label="Cancel" />
            </div>
          </div>
        </div>
      )}

      <ConfiguredProviders refreshTrigger={refreshKey} onEdit={handleEditProvider} />
    </section>
  );
}
