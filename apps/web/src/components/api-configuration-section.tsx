import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { EnhancedButton, EnhancedSelectDropdown, EnhancedTextField, Modal } from '@repo/ui';
import { SearchBar } from './search-bar';
import { ApiKeyCard } from './api-key-card';
import styles from './style/api-configuration-section.module.css';
import sectionStyles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import modalStyles from '@repo/ui/modal.module.css';
import {
  useApiKeys,
  useCreateApiKey,
  useUpdateApiKey,
  useDeleteApiKey,
  useSelectApiKey,
  useTestConnection,
} from '../hooks/use-api-keys';
import type { ApiKeyData } from '@repo/shared-types';
import { transitDecrypt } from '@repo/utils';
import { useStore } from '../store';

type ConnectionStatus = { type: 'success' | 'error'; text: string } | null;

const TRANSIT_SECRET: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_TRANSIT_SECRET ??
  'jfp-default-transit-secret-change-in-prod';

const providerOptions = [
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Groq', value: 'groq' },
  { label: 'Mistral', value: 'mistral' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'Custom (Open AI Supported)', value: 'custom' },
];

/**
 * API configuration section — add/edit AI providers and list them with
 * infinite-scroll pagination. First created provider is active by default;
 * user can switch later.
 */
export function ApiConfigurationSection() {
  const showSnackbar = useStore((state) => state.showSnackbar);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [provider, setProvider] = useState('gemini');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);
  const [model, setModel] = useState('');
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const createApiKey = useCreateApiKey();
  const updateApiKey = useUpdateApiKey();
  const selectApiKey = useSelectApiKey();
  const deleteApiKey = useDeleteApiKey();
  const testConnection = useTestConnection();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    refetch,
  } = useApiKeys(10, debouncedSearch);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

  const resetForm = useCallback(() => {
    setProvider('gemini');
    setCredentials({});
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);
    setIsAddingProvider(false);
    setEditingId(null);
  }, []);

  const handleProviderChange = useCallback((newProvider: string) => {
    setProvider(newProvider);
    setCredentials({});
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);
  }, []);

  const handleCredentialChange = useCallback((key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    setConnectionStatus(null);
  }, []);

  const isCredentialValid = useCallback(() => {
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
  }, [provider, credentials]);

  const step2Enabled = provider.length > 0;
  const step3Enabled = step2Enabled && isCredentialValid();
  const step4Enabled = step3Enabled && connectionStatus?.type === 'success';

  const handleTestConnection = useCallback(() => {
    if (!step3Enabled) return;
    setIsTesting(true);
    setConnectionStatus(null);
    setModel('');
    setModelOptions([]);

    testConnection.mutate(
      { providerName: provider, credentials },
      {
        onSuccess: (result) => {
          setIsTesting(false);
          setConnectionStatus({ type: 'success', text: 'Connection successful!' });
          showSnackbar('Connection successful!', { severity: 'success' });
          if (result.models.length > 0 && result.models[0]) {
            setModelOptions(result.models);
            setModel(result.models[0].value);
          }
        },
        onError: (error) => {
          setIsTesting(false);
          const message = error instanceof Error ? error.message : 'Connection failed';
          setConnectionStatus({ type: 'error', text: message });
          showSnackbar(message, { severity: 'error' });
        },
      }
    );
  }, [step3Enabled, provider, credentials, testConnection, showSnackbar]);

  const handleSave = useCallback(() => {
    if (!step4Enabled || !model) return;
    setIsSaving(true);

    const onSaveSuccess = () => {
      setIsSaving(false);
      resetForm();
      showSnackbar('Provider saved', { severity: 'success' });
    };

    const onSaveError = (error: unknown) => {
      setIsSaving(false);
      const message = error instanceof Error ? error.message : 'Failed to save provider';
      showSnackbar(message, { severity: 'error' });
    };

    if (editingId) {
      updateApiKey.mutate(
        { id: editingId, providerName: provider, credentials, model },
        {
          onSuccess: onSaveSuccess,
          onError: onSaveError,
        }
      );
    } else {
      createApiKey.mutate(
        { providerName: provider, credentials, model },
        {
          onSuccess: onSaveSuccess,
          onError: onSaveError,
        }
      );
    }
  }, [
    step4Enabled,
    model,
    editingId,
    provider,
    credentials,
    createApiKey,
    updateApiKey,
    resetForm,
    showSnackbar,
  ]);

  const handleEdit = useCallback(async (keyData: ApiKeyData) => {
    setIsAddingProvider(true);
    setEditingId(keyData.id);
    setProvider(keyData.provider);

    const { apiKey: _encryptedApiKey, ...restCredentials } = keyData.credentials || {};
    setCredentials(restCredentials);
    setModel(keyData.model || '');
    setModelOptions(keyData.model ? [{ label: keyData.model, value: keyData.model }] : []);
    setConnectionStatus(null);

    if (_encryptedApiKey && _encryptedApiKey.includes(':')) {
      try {
        const decryptedKey = await transitDecrypt(_encryptedApiKey, TRANSIT_SECRET);
        setCredentials((prev) => ({ ...prev, apiKey: decryptedKey }));
      } catch (err) {
        console.error('Failed to decrypt API key for edit form:', err);
      }
    } else if (_encryptedApiKey) {
      setCredentials((prev) => ({ ...prev, apiKey: _encryptedApiKey }));
    }
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteApiKey.mutate(id, {
        onSuccess: () => {
          showSnackbar('Provider deleted', { severity: 'success' });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Failed to delete provider';
          showSnackbar(message, { severity: 'error' });
        },
      });
    },
    [deleteApiKey, showSnackbar]
  );

  const handleSetActive = useCallback(
    (id: string) => {
      selectApiKey.mutate(id, {
        onSuccess: () => {
          showSnackbar('Active provider updated', { severity: 'success' });
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Failed to update active provider';
          showSnackbar(message, { severity: 'error' });
        },
      });
    },
    [selectApiKey, showSnackbar]
  );

  // Infinite scroll sentinels
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = useRef<{
    firstVisibleElementId: string | null;
    firstVisibleElementOffset: number;
  } | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!scrollContainer || !topSentinel || !bottomSentinel) return;

    const scrollObserver = new IntersectionObserver(
      (entries) => {
        const topEntry = entries.find((e) => e.target === topSentinel);
        const bottomEntry = entries.find((e) => e.target === bottomSentinel);

        if (topEntry?.isIntersecting && hasPreviousPage && !isFetchingPreviousPage && !isError) {
          const cards = scrollContainer.querySelectorAll('[data-key-id]');
          if (cards.length > 0) {
            const containerRect = scrollContainer.getBoundingClientRect();
            let firstVisibleElement: Element | null = null;
            let firstVisibleElementOffset = 0;

            for (let i = 0; i < cards.length; i++) {
              const card = cards.item(i);
              if (!card) continue;
              const cardRect = card.getBoundingClientRect();
              if (cardRect.bottom > containerRect.top && cardRect.top < containerRect.bottom) {
                firstVisibleElement = card;
                firstVisibleElementOffset = cardRect.top - containerRect.top;
                break;
              }
            }

            if (firstVisibleElement) {
              pendingScrollRestoreRef.current = {
                firstVisibleElementId: firstVisibleElement.getAttribute('data-key-id'),
                firstVisibleElementOffset,
              };
            }
          }

          fetchPreviousPage();
        }

        if (bottomEntry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isError) {
          fetchNextPage();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.15,
      }
    );

    scrollObserver.observe(topSentinel);
    scrollObserver.observe(bottomSentinel);

    return () => scrollObserver.disconnect();
  }, [
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isError,
  ]);

  useEffect(() => {
    if (!isFetchingPreviousPage && pendingScrollRestoreRef.current && scrollContainerRef.current) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-key-id="${firstVisibleElementId}"]`
      );

      if (targetElement) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollTop +
          (targetRect.top - containerRect.top - firstVisibleElementOffset);
      }

      pendingScrollRestoreRef.current = null;
    }
  }, [isFetchingPreviousPage, items.length]);

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

      <Modal
        isOpen={isAddingProvider}
        onClose={resetForm}
        headerTitle={editingId ? 'Edit AI Provider' : 'Add AI Provider'}
        customProps={{
          childProps: {
            modal: { className: `${modalStyles.modal} ${styles.modalContainer}` },
            body: {
              className: `${modalStyles.body} ${styles.modalBody} ${scrollbarStyles.scrollbarVerticalContainer}`,
            },
          },
        }}
        footer={
          <div className={styles.modalFooter}>
            <div className={styles.modalFormActions}>
              <EnhancedButton colorTheme="secondary" onClick={resetForm} label="Cancel" />
              <EnhancedButton
                label={isSaving ? 'Saving…' : 'Save'}
                colorTheme="primary"
                onClick={handleSave}
                disabled={!step4Enabled || !model || isSaving}
              />
            </div>
          </div>
        }
      >
        <div className={styles.modalForm}>
          <div className={styles.formField}>
            <EnhancedSelectDropdown
              label="AI Provider"
              testId="provider-select"
              options={providerOptions}
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as string)}
            />
          </div>

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
                variant={!step2Enabled ? 'disabled' : 'default'}
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
                  variant={!step2Enabled ? 'disabled' : 'default'}
                />
              </div>
              <div className={styles.formField}>
                <EnhancedTextField
                  label="Project ID (Optional)"
                  value={credentials.projectId || ''}
                  onChange={(e) => handleCredentialChange('projectId', e.target.value)}
                  placeholder="project Id for organization"
                  variant={!step2Enabled ? 'disabled' : 'default'}
                />
              </div>
            </>
          )}

          <div className={styles.formField}>
            <EnhancedTextField
              label="API Key"
              value={credentials.apiKey || ''}
              onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
              placeholder="Enter your API key"
              variant={!step2Enabled ? 'disabled' : 'default'}
            />
          </div>

          <div className={styles.rowDivider} />

          <div className={styles.formField}>
            <div className={styles.testConnectionRow}>
              <EnhancedButton
                colorTheme="tertiary"
                onClick={handleTestConnection}
                disabled={!step3Enabled || isTesting}
                label={isTesting ? 'Testing…' : 'Test Connection'}
                size="medium"
                customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
              />
            </div>
          </div>

          <div className={styles.rowDivider} />

          <div className={styles.formField}>
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
      </Modal>

      <div className={styles.searchContainer}>
        <SearchBar
          placeholder="Search providers..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {isLoading ? (
        <p className={sectionStyles.loadingText}>Loading providers...</p>
      ) : items.length === 0 ? (
        <p className={sectionStyles.emptyText}>
          {debouncedSearch ? 'No providers match your search.' : 'No AI providers configured yet.'}
        </p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          <div ref={topSentinelRef} className={styles.sentinel} />
          {((hasPreviousPage && !isError) ||
            (hasPreviousPage && isError && isFetchingPreviousPage)) && (
            <p className={styles.directionalLoader}>Loading...</p>
          )}
          <div className={styles.itemList}>
            {items.map((keyData) => (
              <div key={keyData.id} data-key-id={keyData.id}>
                <ApiKeyCard
                  keyData={keyData}
                  isActive={keyData.active}
                  isSettingActive={selectApiKey.isPending}
                  onSetActive={handleSetActive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
          <div ref={bottomSentinelRef} className={styles.sentinel} />
          {((hasNextPage && !isError) || (hasNextPage && isError && isFetchingNextPage)) && (
            <p className={styles.directionalLoader}>Loading...</p>
          )}
        </div>
      )}

      {isError && (
        <div className={sectionStyles.errorContainer}>
          <p className={sectionStyles.errorText}>Failed to load providers. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={() => refetch()}
            startIcon={<RefreshIcon fontSize="small" />}
          />
        </div>
      )}
    </section>
  );
}
