import { useEffect, useState, useReducer, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Radio, CircularProgress } from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import styles from '../routes/style/resume-version.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedTextField, EnhancedTooltipWithText } from '@repo/ui';
import type {
  PaginatedVersionListItem,
  PaginatedVersionResponse,
  ResumeData,
  ResumeVersionMetadata,
} from '@repo/shared-types';
import { useResumeVersionsCache } from '../hooks/use-resume-versions-cache';
import { usePersonasCache } from '../hooks/use-personas-cache';
import { useResumesCache } from '../hooks/use-resumes-cache';

const MAX_PAGES = 10;

// Pagination state type
type PaginationState = {
  versions: PaginatedVersionListItem[];
  firstPage: number;
  lastPage: number;
  totalPages: number;
  isInitialLoading: boolean;
  isFetchingNext: boolean;
  isFetchingPrevious: boolean;
  pageSizes: Map<number, number>;
};

// Pagination action types
type PaginationAction =
  | { type: 'FETCH_START'; direction?: 'next' | 'previous' }
  | {
      type: 'FETCH_SUCCESS';
      items: PaginatedVersionListItem[];
      page: number;
      totalPages: number;
      direction?: 'next' | 'previous';
    }
  | { type: 'FETCH_ERROR'; direction?: 'next' | 'previous' }
  | { type: 'RESET' }
  | { type: 'SET_ACTIVE'; id: string };

// Initial state
const initialState: PaginationState = {
  versions: [],
  firstPage: 1,
  lastPage: 1,
  totalPages: 1,
  isInitialLoading: true,
  isFetchingNext: false,
  isFetchingPrevious: false,
  pageSizes: new Map(),
};

// Reducer function
function paginationReducer(state: PaginationState, action: PaginationAction): PaginationState {
  switch (action.type) {
    case 'FETCH_START':
      if (action.direction === 'next') {
        return { ...state, isFetchingNext: true };
      } else if (action.direction === 'previous') {
        return { ...state, isFetchingPrevious: true };
      }
      return { ...state, isInitialLoading: true };

    case 'FETCH_SUCCESS': {
      const { items, page, totalPages, direction } = action;

      if (direction === 'next') {
        const newPageSizes = new Map(state.pageSizes);
        newPageSizes.set(page, items.length);

        let newVersions = [...state.versions, ...items];
        let newFirstPage = state.firstPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const firstPageSize = state.pageSizes.get(state.firstPage) || 0;
          newVersions = newVersions.slice(firstPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.firstPage);
          newFirstPage = state.firstPage + 1;
        }

        return {
          ...state,
          versions: newVersions,
          firstPage: newFirstPage,
          lastPage: page,
          totalPages,
          pageSizes: newPageSizesAfterEviction,
          isFetchingNext: false,
          isInitialLoading: false,
        };
      } else if (direction === 'previous') {
        const newPageSizes = new Map(state.pageSizes);
        newPageSizes.set(page, items.length);

        let newVersions = [...items, ...state.versions];
        let newLastPage = state.lastPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const lastPageSize = state.pageSizes.get(state.lastPage) || 0;
          newVersions = newVersions.slice(0, newVersions.length - lastPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.lastPage);
          newLastPage = state.lastPage - 1;
        }

        return {
          ...state,
          versions: newVersions,
          firstPage: page,
          lastPage: newLastPage,
          totalPages,
          pageSizes: newPageSizesAfterEviction,
          isFetchingPrevious: false,
          isInitialLoading: false,
        };
      }
      // Initial fetch
      const newPageSizes = new Map();
      newPageSizes.set(page, items.length);
      return {
        ...state,
        versions: items,
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
      };

    case 'RESET':
      return initialState;

    case 'SET_ACTIVE':
      return {
        ...state,
        versions: state.versions.map((v) => ({
          ...v,
          active: v.id === action.id,
        })),
      };

    default:
      return state;
  }
}

// Version card state for expanded view
interface VersionCardState {
  isExpanded: boolean;
  parsedData: ResumeData | null;
  isLoadingData: boolean;
}

interface ResumeVersionSectionProps {
  resumeId: string;
  personaId: string;
  onBack: () => void;
  onBackToPersonas: () => void;
  isFromAutofill?: boolean;
  onConfirmSelection?: () => void;
}

export function ResumeVersionSection({
  resumeId,
  personaId,
  onBack,
  onBackToPersonas,
  isFromAutofill = false,
  onConfirmSelection,
}: ResumeVersionSectionProps) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(paginationReducer, initialState);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLoading, setActiveLoading] = useState(false);
  // Track expanded state and parsed data for each version
  const [versionCardStates, setVersionCardStates] = useState<Record<string, VersionCardState>>({});
  const limit = 10;

  // Cache hooks - need all three for invalidation when setting version active
  const { getPage, setPage, invalidateForResume } = useResumeVersionsCache();
  const { invalidateCache: invalidatePersonasCache } = usePersonasCache();
  const { invalidateForPersona } = useResumesCache();

  // Refs for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = useRef<{
    firstVisibleElementId: string | null;
    firstVisibleElementOffset: number;
  } | null>(null);

  // Derived values
  const hasPreviousPage = state.firstPage > 1;
  const hasNextPage = state.lastPage < state.totalPages;

  const fetchVersions = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      // Capture the first visible element BEFORE fetching previous page
      if (direction === 'previous' && scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const versionCards = scrollContainer.querySelectorAll('[data-version-id]');

        if (versionCards.length > 0) {
          const containerRect = scrollContainer.getBoundingClientRect();
          let firstVisibleElement: Element | null = null;
          let firstVisibleElementOffset = 0;

          for (let i = 0; i < versionCards.length; i++) {
            const card = versionCards.item(i);
            if (!card) continue;
            const cardRect = card.getBoundingClientRect();

            // Check if this card is visible in the viewport
            if (cardRect.bottom > containerRect.top && cardRect.top < containerRect.bottom) {
              firstVisibleElement = card;
              firstVisibleElementOffset = cardRect.top - containerRect.top;
              break;
            }
          }

          if (firstVisibleElement) {
            pendingScrollRestoreRef.current = {
              firstVisibleElementId: firstVisibleElement.getAttribute('data-version-id'),
              firstVisibleElementOffset: firstVisibleElementOffset,
            };
          }
        }
      }

      dispatch({ type: 'FETCH_START', direction });

      // Try to get from cache first
      const cachedData = await getPage(pageNum, resumeId, search || '');
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

      // Fetch from API if not in cache
      chrome.runtime.sendMessage(
        {
          action: 'GET_RESUME_VERSIONS',
          payload: { resumeId, personaId, page: pageNum, limit, search: search || '' },
        },
        (res: { success: boolean; data?: PaginatedVersionResponse; error?: string }) => {
          if (res?.success && res.data) {
            // Store in cache
            setPage(res.data, resumeId, search || '');

            dispatch({
              type: 'FETCH_SUCCESS',
              items: res.data.items,
              page: pageNum,
              totalPages: res.data.totalPages,
              direction,
            });
          } else {
            dispatch({ type: 'FETCH_ERROR', direction });
          }
        }
      );
    },
    [getPage, setPage, resumeId, personaId]
  );

  // Restore scroll position after fetching previous page completes
  useEffect(() => {
    if (
      !state.isFetchingPrevious &&
      pendingScrollRestoreRef.current &&
      scrollContainerRef.current
    ) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;

      // Find the element by its version id
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-version-id="${firstVisibleElementId}"]`
      );

      if (targetElement) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const newScrollTop =
          scrollContainerRef.current.scrollTop +
          (targetRect.top - containerRect.top - firstVisibleElementOffset);
        scrollContainerRef.current.scrollTop = newScrollTop;
      }

      // Clear pending restore after applying
      pendingScrollRestoreRef.current = null;
    }
  }, [state.isFetchingPrevious, state.versions.length]);

  // Initial fetch and search
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchVersions(1, searchQuery);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, resumeId]);

  // Intersection Observer for infinite scroll
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
          !state.isInitialLoading
        ) {
          fetchVersions(state.firstPage - 1, searchQuery, 'previous');
        }

        if (
          bottomEntry?.isIntersecting &&
          hasNextPage &&
          !state.isFetchingNext &&
          !state.isInitialLoading
        ) {
          fetchVersions(state.lastPage + 1, searchQuery, 'next');
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
    fetchVersions,
    hasNextPage,
    hasPreviousPage,
    state.isFetchingNext,
    state.isFetchingPrevious,
    state.isInitialLoading,
    state.firstPage,
    state.lastPage,
    searchQuery,
  ]);

  const handleSetActive = async (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setActiveLoading(true);
      chrome.runtime.sendMessage(
        { action: 'SET_ACTIVE_VERSION', payload: { resumeId, versionId: id, personaId } },
        async (res: {
          success: boolean;
          message?: string;
          data?: ResumeVersionMetadata & {
            previousPersonaId: string | null;
            newPersonaId: string;
            previousResumeId: string | null;
            newResumeId: string;
          };
        }) => {
          if (res?.success) {
            dispatch({ type: 'SET_ACTIVE', id });
            const invalidationPromises: Promise<void>[] = [];
            if (
              res.data?.previousPersonaId !== null &&
              res.data?.previousPersonaId !== res.data?.newPersonaId
            ) {
              invalidationPromises.push(invalidatePersonasCache());
            }

            if (
              res.data?.previousResumeId !== null &&
              res.data?.previousResumeId !== res.data?.newResumeId
            ) {
              if (res.data?.previousPersonaId)
                invalidationPromises.push(invalidateForPersona(res.data?.previousPersonaId));
              if (
                res.data?.newPersonaId &&
                res.data?.previousPersonaId !== res.data?.newPersonaId
              ) {
                invalidationPromises.push(invalidateForPersona(res.data?.newPersonaId));
              }
            }
            if (res.data?.previousResumeId)
              invalidationPromises.push(invalidateForResume(res.data?.previousResumeId));
            if (res.data?.newResumeId && res.data?.previousResumeId !== res.data?.newResumeId)
              invalidationPromises.push(invalidateForResume(res.data?.newResumeId));

            await Promise.all(invalidationPromises);
            dispatch({ type: 'RESET' });
            fetchVersions(1, searchQuery);
          }
          setActiveLoading(false);
        }
      );
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Fetch parsed data for a version
  const fetchParsedData = async (versionId: string): Promise<ResumeData | null> => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return null;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'GET_VERSION_PARSED_DATA', payload: { resumeId, versionId } },
        (res: { success: boolean; data?: ResumeData; error?: string }) => {
          if (res?.success && res.data) {
            resolve(res.data);
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  // Toggle expand and fetch parsed data
  const handleToggleExpand = async (versionId: string) => {
    const currentState = versionCardStates[versionId] || {
      isExpanded: false,
      parsedData: null,
      isLoadingData: false,
    };

    if (!currentState.isExpanded && !currentState.parsedData && !currentState.isLoadingData) {
      // Fetch parsed data when expanding for the first time
      setVersionCardStates((prev) => ({
        ...prev,
        [versionId]: { ...currentState, isLoadingData: true },
      }));

      try {
        const data = await fetchParsedData(versionId);
        setVersionCardStates((prev) => ({
          ...prev,
          [versionId]: {
            isExpanded: true,
            parsedData: data,
            isLoadingData: false,
          },
        }));
      } catch {
        setVersionCardStates((prev) => ({
          ...prev,
          [versionId]: { ...currentState, isLoadingData: false },
        }));
      }
    } else {
      setVersionCardStates((prev) => ({
        ...prev,
        [versionId]: { ...currentState, isExpanded: !currentState.isExpanded },
      }));
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`${styles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Resume Versions</h1>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <p className={styles.infoText}>
          To create, edit, or delete versions, please use the{' '}
          <a
            href={import.meta.env.VITE_WEB_URL || 'http://localhost:5174'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.infoLink}
          >
            web application{' '}
            <OpenInNewIcon style={{ fontSize: '0.75rem', verticalAlign: 'middle' }} />
          </a>
        </p>
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        {isFromAutofill ? (
          <>
            <span
              className={styles.navLink}
              onClick={() => navigate({ to: '/autofill', search: { step: 1 } })}
            >
              Step 2
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navLink} onClick={onBackToPersonas}>
              All Personas
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navLink} onClick={onBack}>
              Resumes
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navCurrent}>Resume Versions</span>
          </>
        ) : (
          <>
            <span className={styles.navLink} onClick={onBackToPersonas}>
              All Personas
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navLink} onClick={onBack}>
              Resumes
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navCurrent}>Resume Versions</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <EnhancedTextField
          label=""
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search versions..."
        />
      </div>

      {/* Version List */}
      {state.isInitialLoading && state.versions.length === 0 ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} sx={{ color: 'var(--blue-400)' }} />
        </div>
      ) : state.versions.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery ? 'No versions match your search.' : 'No versions found.'}
        </p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          {/* Top sentinel for scroll up detection */}
          <div ref={topSentinelRef} className={styles.sentinel}>
            {state.isFetchingPrevious && (
              <div className={styles.sentinelLoader}>
                <CircularProgress size={20} sx={{ color: 'var(--blue-400)' }} />
              </div>
            )}
          </div>

          <div className={styles.versionList}>
            {state.versions.map((version) => {
              const radioTooltip = version.active ? 'Active' : 'Click to set as active';
              const cardState = versionCardStates[version.id] || {
                isExpanded: false,
                parsedData: null,
                isLoadingData: false,
              };

              return (
                <div
                  key={version.id}
                  data-version-id={version.id}
                  className={styles.versionCardWrapper}
                >
                  <div className={`${styles.versionCard} ${version.active ? styles.selected : ''}`}>
                    {/* Section 1: Radio button with tooltip */}
                    <div className={styles.radioSection}>
                      <EnhancedTooltipWithText
                        description={radioTooltip}
                        showIcon={false}
                        placement="top"
                      >
                        <Radio
                          checked={version.active}
                          onChange={() => handleSetActive(version.id)}
                          disabled={activeLoading}
                          sx={{
                            color: 'var(--grey-500)',
                            '&.Mui-disabled': {
                              color: 'var(--grey-500)',
                              pointerEvents: 'none',
                              opacity: 0.5,
                            },
                            '&.Mui-checked': {
                              color: 'var(--blue-400)',
                            },
                          }}
                        />
                      </EnhancedTooltipWithText>
                    </div>

                    {/* Section 2: Data */}
                    <div className={styles.dataSection}>
                      <div className={styles.versionInfo}>
                        <p className={styles.versionName}>{version.versionName}</p>
                        <div className={styles.versionMeta}>
                          <span className={styles.versionSize}>
                            {formatFileSize(version.fileSize)}
                          </span>
                          <span className={styles.versionDate}>
                            Updated {formatDate(version.updatedAt)}
                          </span>
                        </div>
                        {version.keywords && version.keywords.length > 0 && (
                          <div className={styles.versionKeywords}>
                            {version.keywords.slice(0, 3).map((keyword, idx) => (
                              <span key={idx} className={styles.keywordTag}>
                                {keyword}
                              </span>
                            ))}
                            {version.keywords.length > 3 && (
                              <span className={styles.keywordTag}>
                                +{version.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        {version.comment && (
                          <p className={styles.versionComment}>{version.comment}</p>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Action buttons */}
                    <div className={styles.actionsSection}>
                      <EnhancedTooltipWithText
                        description={cardState.isExpanded ? 'Hide parsed data' : 'View parsed data'}
                        showIcon={false}
                        placement="top"
                      >
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleToggleExpand(version.id)}
                          disabled={cardState.isLoadingData}
                        >
                          {cardState.isLoadingData ? (
                            <CircularProgress size={20} sx={{ color: 'var(--blue-400)' }} />
                          ) : cardState.isExpanded ? (
                            <KeyboardArrowUp sx={{ fontSize: '1.25rem' }} />
                          ) : (
                            <KeyboardArrowDown sx={{ fontSize: '1.25rem' }} />
                          )}
                        </button>
                      </EnhancedTooltipWithText>
                    </div>
                  </div>

                  {/* Expanded parsed data view */}
                  {cardState.isExpanded && (
                    <div className={styles.expandedSection}>
                      <div className={styles.parsedDataSection}>
                        <span className={styles.parsedDataLabel}>Parsed Data:</span>
                        {cardState.isLoadingData ? (
                          <p className={styles.loadingText}>Loading parsed data...</p>
                        ) : cardState.parsedData ? (
                          <pre className={styles.jsonPreview}>
                            {JSON.stringify(cardState.parsedData, null, 2)}
                          </pre>
                        ) : (
                          <p className={styles.noDataText}>No parsed data available</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom sentinel for scroll down detection */}
          <div ref={bottomSentinelRef} className={styles.sentinel}>
            {state.isFetchingNext && (
              <div className={styles.sentinelLoader}>
                <CircularProgress size={20} sx={{ color: 'var(--blue-400)' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
