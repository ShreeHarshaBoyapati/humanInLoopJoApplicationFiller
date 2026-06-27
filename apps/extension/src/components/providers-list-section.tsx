/**
 * Providers list section — read-only, paginated, IndexedDB-cached list of
 * configured AI providers. The active provider is chosen via a Material Radio
 * per row. Subscribes to RESOURCE_CHANGED events to stay in sync with the backend.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { EnhancedButton } from '@repo/ui';
import type { ApiKeyData, PaginatedApiKeysResponse } from '@repo/shared-types';

import { useApiKeysCache } from '../hooks/use-api-keys-cache';
import { useSnackbar } from '../hooks/use-snackbar';
import { buildWebDeepLink } from '../utils/build-web-deep-link';
import { ProviderCard } from './provider-card';
import { SearchBar } from './search-bar';
import styles from './style/providers-list-section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';

const MAX_PAGES = 10;

type PaginationState = {
  providers: ApiKeyData[];
  firstPage: number;
  lastPage: number;
  totalPages: number;
  isInitialLoading: boolean;
  isFetchingNext: boolean;
  isFetchingPrevious: boolean;
  isError: boolean;
  errorPage: number | null;
  errorDirection: 'next' | 'previous' | undefined;
  pageSizes: Map<number, number>;
  isSettingActive: boolean;
};

type PaginationAction =
  | { type: 'FETCH_START'; direction?: 'next' | 'previous' }
  | {
      type: 'FETCH_SUCCESS';
      items: ApiKeyData[];
      page: number;
      totalPages: number;
      direction?: 'next' | 'previous';
    }
  | { type: 'FETCH_ERROR'; page: number; direction?: 'next' | 'previous' }
  | { type: 'RESET' }
  | { type: 'SET_ACTIVE'; id: string };

const initialState: PaginationState = {
  providers: [],
  firstPage: 1,
  lastPage: 1,
  totalPages: 1,
  isInitialLoading: true,
  isFetchingNext: false,
  isFetchingPrevious: false,
  isError: false,
  errorPage: null,
  errorDirection: undefined,
  pageSizes: new Map(),
  isSettingActive: false,
};

function paginationReducer(state: PaginationState, action: PaginationAction): PaginationState {
  switch (action.type) {
    case 'FETCH_START':
      if (action.direction === 'next') {
        return { ...state, isFetchingNext: true, isError: false };
      }
      if (action.direction === 'previous') {
        return { ...state, isFetchingPrevious: true, isError: false };
      }
      return { ...state, isInitialLoading: true, isError: false };

    case 'FETCH_SUCCESS': {
      const { items, page, totalPages, direction } = action;

      if (direction === 'next') {
        const newPageSizes = new Map(state.pageSizes);
        newPageSizes.set(page, items.length);

        let newProviders = [...state.providers, ...items];
        let newFirstPage = state.firstPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const firstPageSize = state.pageSizes.get(state.firstPage) || 0;
          newProviders = newProviders.slice(firstPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.firstPage);
          newFirstPage = state.firstPage + 1;
        }

        return {
          ...state,
          providers: newProviders,
          firstPage: newFirstPage,
          lastPage: page,
          totalPages,
          pageSizes: newPageSizesAfterEviction,
          isFetchingNext: false,
          isInitialLoading: false,
        };
      }

      if (direction === 'previous') {
        const newPageSizes = new Map(state.pageSizes);
        newPageSizes.set(page, items.length);

        let newProviders = [...items, ...state.providers];
        let newLastPage = state.lastPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const lastPageSize = state.pageSizes.get(state.lastPage) || 0;
          newProviders = newProviders.slice(0, newProviders.length - lastPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.lastPage);
          newLastPage = state.lastPage - 1;
        }

        return {
          ...state,
          providers: newProviders,
          firstPage: page,
          lastPage: newLastPage,
          totalPages,
          pageSizes: newPageSizesAfterEviction,
          isFetchingPrevious: false,
          isInitialLoading: false,
        };
      }

      const newPageSizes = new Map();
      newPageSizes.set(page, items.length);
      return {
        ...state,
        providers: items,
        firstPage: page,
        lastPage: page,
        totalPages,
        pageSizes: newPageSizes,
        isInitialLoading: false,
        isFetchingNext: false,
        isFetchingPrevious: false,
      };
    }

    case 'FETCH_ERROR':
      return {
        ...state,
        isInitialLoading: false,
        isFetchingNext: false,
        isFetchingPrevious: false,
        isError: true,
        errorPage: action.page,
        errorDirection: action.direction,
      };

    case 'RESET':
      return initialState;

    case 'SET_ACTIVE':
      return {
        ...state,
        providers: state.providers.map((p) => ({
          ...p,
          active: p.id === action.id,
        })),
      };

    default:
      return state;
  }
}

export function ProvidersListSection() {
  const [state, dispatch] = useReducer(paginationReducer, initialState);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;

  const { getPage, setPage } = useApiKeysCache();
  const { showSnackbar } = useSnackbar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = useRef<{
    firstVisibleElementId: string | null;
    firstVisibleElementOffset: number;
  } | null>(null);

  const hasPreviousPage = state.firstPage > 1;
  const hasNextPage = state.lastPage < state.totalPages;

  const fetchApiKeys = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      if (direction === 'previous' && scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const providerCards = scrollContainer.querySelectorAll('[data-provider-id]');

        if (providerCards.length > 0) {
          const containerRect = scrollContainer.getBoundingClientRect();
          let firstVisibleElement: Element | null = null;
          let firstVisibleElementOffset = 0;

          for (let i = 0; i < providerCards.length; i++) {
            const card = providerCards.item(i);
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
              firstVisibleElementId: firstVisibleElement.getAttribute('data-provider-id'),
              firstVisibleElementOffset,
            };
          }
        }
      }

      dispatch({ type: 'FETCH_START', direction });

      const cachedData = await getPage(pageNum, search || '');
      if (cachedData) {
        dispatch({
          type: 'FETCH_SUCCESS',
          items: cachedData.items,
          page: cachedData.page,
          totalPages: cachedData.totalPages,
          direction,
        });
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: 'GET_CONFIGURED_PROVIDERS',
          payload: { page: pageNum, limit, search: search || '' },
        },
        (res: { success: boolean; data?: PaginatedApiKeysResponse; error?: string }) => {
          if (res?.success && res.data) {
            setPage(res.data, search || '');
            dispatch({
              type: 'FETCH_SUCCESS',
              items: res.data.items,
              page: pageNum,
              totalPages: res.data.totalPages,
              direction,
            });
          } else {
            dispatch({ type: 'FETCH_ERROR', page: pageNum, direction });
          }
        }
      );
    },
    [getPage, setPage]
  );

  useEffect(() => {
    if (
      !state.isFetchingPrevious &&
      pendingScrollRestoreRef.current &&
      scrollContainerRef.current
    ) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;

      const targetElement = scrollContainerRef.current.querySelector(
        `[data-provider-id="${firstVisibleElementId}"]`
      );

      if (targetElement) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const newScrollTop =
          scrollContainerRef.current.scrollTop +
          (targetRect.top - containerRect.top - firstVisibleElementOffset);
        scrollContainerRef.current.scrollTop = newScrollTop;
      }

      pendingScrollRestoreRef.current = null;
    }
  }, [state.isFetchingPrevious, state.providers.length]);

  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchApiKeys(1, searchQuery);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handle = (message: {
      action?: string;
      payload?: { resource?: string; action?: string };
    }) => {
      if (message.action !== 'RESOURCE_CHANGED') return;
      const payload = message.payload;
      if (!payload || payload.resource !== 'apiKey') return;
      dispatch({ type: 'RESET' });
      fetchApiKeys(1, searchQuery);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    };

    chrome.runtime.onMessage.addListener(handle);
    return () => {
      chrome.runtime.onMessage.removeListener(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!scrollContainer || !topSentinel || !bottomSentinel) return;

    const scrollObserver = new IntersectionObserver(
      (entries) => {
        const topEntry = entries.find((e) => e.target === topSentinel);
        const bottomEntry = entries.find((e) => e.target === bottomSentinel);

        if (
          topEntry?.isIntersecting &&
          hasPreviousPage &&
          !state.isFetchingPrevious &&
          !state.isInitialLoading &&
          !state.isError
        ) {
          fetchApiKeys(state.firstPage - 1, searchQuery, 'previous');
        }

        if (
          bottomEntry?.isIntersecting &&
          hasNextPage &&
          !state.isFetchingNext &&
          !state.isInitialLoading &&
          !state.isError
        ) {
          fetchApiKeys(state.lastPage + 1, searchQuery, 'next');
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
    fetchApiKeys,
    hasNextPage,
    hasPreviousPage,
    state.isFetchingNext,
    state.isFetchingPrevious,
    state.isInitialLoading,
    state.isError,
    state.firstPage,
    state.lastPage,
    searchQuery,
  ]);

  const handleSetActive = useCallback(
    (id: string) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      const previousActiveId = state.providers.find((p) => p.active)?.id ?? null;

      dispatch({ type: 'SET_ACTIVE', id });
      chrome.runtime.sendMessage(
        { action: 'SELECT_PROVIDER', payload: { id } },
        (res: { success: boolean; error?: string }) => {
          if (!res?.success) {
            if (previousActiveId) {
              dispatch({ type: 'SET_ACTIVE', id: previousActiveId });
            }
            showSnackbar('Failed to update active provider', { severity: 'error' });
          }
        }
      );
    },
    [showSnackbar, state.providers]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleRetry = () => {
    if (state.errorPage !== null) {
      fetchApiKeys(state.errorPage, searchQuery, state.errorDirection);
    }
  };

  const webSettingsUrl = buildWebDeepLink({ path: '/settings' });

  return (
    <section className={styles.section}>
      {/* Section header */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>AI PROVIDERS</span>
      </div>

      {/* Info banner */}
      <div className={styles.infoBanner}>
        <p className={styles.infoText}>
          To add, edit, or delete providers, please use the{' '}
          <a
            href={webSettingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.infoLink}
          >
            web application{' '}
            <OpenInNewIcon style={{ fontSize: '0.75rem', verticalAlign: 'middle' }} />
          </a>
        </p>
      </div>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <SearchBar
          placeholder="Search by provider or model"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Provider list */}
      {state.isInitialLoading && state.providers.length === 0 ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} sx={{ color: 'var(--blue-500)' }} />
        </div>
      ) : state.isError && state.providers.length === 0 ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load providers. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={handleRetry}
            startIcon={<Refresh fontSize="small" />}
            className={styles.errorRetryBtn}
          />
        </div>
      ) : state.providers.length === 0 ? (
        <p className={styles.emptyState}>
          {searchQuery ? 'No providers match your search.' : 'No providers configured.'}
        </p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          <div ref={topSentinelRef} className={styles.sentinel}>
            {((hasPreviousPage && !state.isError) ||
              (hasPreviousPage && state.isError && state.isFetchingPrevious)) && (
              <CircularProgress size={20} sx={{ color: 'var(--blue-500)' }} />
            )}
          </div>

          <div className={styles.providerList}>
            {state.providers.map((provider) => (
              <div key={provider.id} data-provider-id={provider.id}>
                <ProviderCard
                  provider={provider}
                  isSettingActive={state.isSettingActive}
                  onSetActive={handleSetActive}
                />
              </div>
            ))}
          </div>

          <div ref={bottomSentinelRef} className={styles.sentinel}>
            {((hasNextPage && !state.isError) ||
              (hasNextPage && state.isError && state.isFetchingNext)) && (
              <CircularProgress size={20} sx={{ color: 'var(--blue-500)' }} />
            )}
          </div>
        </div>
      )}

      {state.isError && state.providers.length > 0 && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load more providers. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={handleRetry}
            startIcon={<Refresh fontSize="small" />}
            className={styles.errorRetryBtn}
          />
        </div>
      )}
    </section>
  );
}
