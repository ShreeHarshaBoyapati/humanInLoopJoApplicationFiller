import { useEffect, useState, useReducer, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Radio, CircularProgress } from '@mui/material';
import { ArrowForward, OpenInNew as OpenInNewIcon, Refresh } from '@mui/icons-material';
import styles from '../routes/style/resume.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedTextField, EnhancedTooltipWithText, EnhancedButton } from '@repo/ui';
import type { PaginatedResumeListItem, PaginatedResumeResponse } from '@repo/shared-types';
import { useResumesCache } from '../hooks/use-resumes-cache';

const MAX_PAGES = 10;

// Pagination state type
type PaginationState = {
  resumes: PaginatedResumeListItem[];
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
};

// Pagination action types
type PaginationAction =
  | { type: 'FETCH_START'; direction?: 'next' | 'previous' }
  | {
      type: 'FETCH_SUCCESS';
      items: PaginatedResumeListItem[];
      page: number;
      totalPages: number;
      direction?: 'next' | 'previous';
    }
  | { type: 'FETCH_ERROR'; page: number; direction?: 'next' | 'previous' }
  | { type: 'RESET' }
  | { type: 'SET_ACTIVE'; id: string };

// Initial state
const initialState: PaginationState = {
  resumes: [],
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
};

// Reducer function
function paginationReducer(state: PaginationState, action: PaginationAction): PaginationState {
  switch (action.type) {
    case 'FETCH_START':
      if (action.direction === 'next') {
        return { ...state, isFetchingNext: true, isError: false };
      } else if (action.direction === 'previous') {
        return { ...state, isFetchingPrevious: true, isError: false };
      }
      return { ...state, isInitialLoading: true, isError: false };

    case 'FETCH_SUCCESS': {
      const { items, page, totalPages, direction } = action;

      if (direction === 'next') {
        const newPageSizes = new Map(state.pageSizes);
        newPageSizes.set(page, items.length);

        let newResumes = [...state.resumes, ...items];
        let newFirstPage = state.firstPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const firstPageSize = state.pageSizes.get(state.firstPage) || 0;
          newResumes = newResumes.slice(firstPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.firstPage);
          newFirstPage = state.firstPage + 1;
        }

        return {
          ...state,
          resumes: newResumes,
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

        let newResumes = [...items, ...state.resumes];
        let newLastPage = state.lastPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const lastPageSize = state.pageSizes.get(state.lastPage) || 0;
          newResumes = newResumes.slice(0, newResumes.length - lastPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.lastPage);
          newLastPage = state.lastPage - 1;
        }

        return {
          ...state,
          resumes: newResumes,
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
        resumes: items,
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
        resumes: state.resumes.map((r) => ({
          ...r,
          active: r.id === action.id,
        })),
      };

    default:
      return state;
  }
}

interface ResumeSectionProps {
  personaId: string;
  onSelectResume: (resume: PaginatedResumeListItem) => void;
  onBack: () => void;
  isFromAutofill?: boolean;
}

export function ResumeSection({
  personaId,
  onSelectResume,
  onBack,
  isFromAutofill = false,
}: ResumeSectionProps) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(paginationReducer, initialState);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;

  // Cache hook
  const { getPage, setPage } = useResumesCache();

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

  const fetchResumes = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      // Capture the first visible element BEFORE fetching previous page
      if (direction === 'previous' && scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const resumeCards = scrollContainer.querySelectorAll('[data-resume-id]');

        if (resumeCards.length > 0) {
          const containerRect = scrollContainer.getBoundingClientRect();
          let firstVisibleElement: Element | null = null;
          let firstVisibleElementOffset = 0;

          for (let i = 0; i < resumeCards.length; i++) {
            const card = resumeCards.item(i);
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
              firstVisibleElementId: firstVisibleElement.getAttribute('data-resume-id'),
              firstVisibleElementOffset: firstVisibleElementOffset,
            };
          }
        }
      }

      dispatch({ type: 'FETCH_START', direction });

      // Try to get from cache first
      const cachedData = await getPage(pageNum, personaId, search || '');
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
          action: 'GET_RESUMES',
          payload: { personaId, page: pageNum, limit, search: search || '' },
        },
        (res: { success: boolean; data?: PaginatedResumeResponse; error?: string }) => {
          if (res?.success && res.data) {
            // Store in cache
            setPage(res.data, personaId, search || '');

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
    [getPage, setPage, personaId]
  );

  // Restore scroll position after fetching previous page completes
  useEffect(() => {
    if (
      !state.isFetchingPrevious &&
      pendingScrollRestoreRef.current &&
      scrollContainerRef.current
    ) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;

      // Find the element by its resume id
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-resume-id="${firstVisibleElementId}"]`
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
  }, [state.isFetchingPrevious, state.resumes.length]);

  // Initial fetch and search
  useEffect(() => {
    if (personaId) {
      dispatch({ type: 'RESET' });
      fetchResumes(1, searchQuery);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, personaId]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const handle = (message: {
      action?: string;
      payload?: { resource?: string; action?: string };
    }) => {
      if (message.action !== 'RESOURCE_CHANGED') return;
      const payload = message.payload;
      if (!payload || payload.resource !== 'resume') return;
      if (payload.action === 'update' || payload.action === 'setActive') return;
      if (!personaId) return;
      dispatch({ type: 'RESET' });
      fetchResumes(1, searchQuery);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    };
    chrome.runtime.onMessage.addListener(handle);
    return () => {
      chrome.runtime.onMessage.removeListener(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, personaId]);

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
          !state.isInitialLoading &&
          !state.isError
        ) {
          fetchResumes(state.firstPage - 1, searchQuery, 'previous');
        }

        if (
          bottomEntry?.isIntersecting &&
          hasNextPage &&
          !state.isFetchingNext &&
          !state.isInitialLoading &&
          !state.isError
        ) {
          fetchResumes(state.lastPage + 1, searchQuery, 'next');
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
    fetchResumes,
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleRetry = () => {
    if (state.errorPage !== null) {
      fetchResumes(state.errorPage, searchQuery, state.errorDirection);
    }
  };

  return (
    <div className={`${styles.sectionContainer}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Resumes</h1>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <p className={styles.infoText}>
          To create, edit, or delete resumes, please use the{' '}
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
            <span className={styles.navLink} onClick={onBack}>
              All Personas
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navCurrent}>Resumes</span>
          </>
        ) : (
          <>
            <span className={styles.navLink} onClick={onBack}>
              All Personas
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navCurrent}>Resumes</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <EnhancedTextField
          label=""
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search resumes..."
        />
      </div>

      {/* Resume List */}
      {state.isInitialLoading && state.resumes.length === 0 ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} sx={{ color: 'var(--blue-500)' }} />
        </div>
      ) : state.isError && state.resumes.length === 0 ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load resumes. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={handleRetry}
            startIcon={<Refresh fontSize="small" />}
          />
        </div>
      ) : state.resumes.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery ? 'No resumes match your search.' : 'No resumes found.'}
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
                <CircularProgress size={20} sx={{ color: 'var(--blue-500)' }} />
              </div>
            )}
          </div>

          <div className={styles.resumeList}>
            {state.resumes.map((resume) => {
              const radioTooltip = resume.active
                ? 'Active (set via resume version)'
                : 'Set a resume version as active to make this resume active';

              return (
                <div
                  key={resume.id}
                  data-resume-id={resume.id}
                  className={`${styles.resumeCard} ${resume.active ? styles.selected : ''}`}
                >
                  {/* Section 1: Radio button with tooltip */}
                  <div className={styles.radioSection}>
                    <EnhancedTooltipWithText
                      description={radioTooltip}
                      showIcon={false}
                      placement="top"
                    >
                      <Radio
                        checked={resume.active}
                        disabled
                        sx={{
                          color: 'var(--grey-500)',
                          '&.Mui-disabled': {
                            color: resume.active ? 'var(--blue-500)' : 'var(--grey-500)',
                            pointerEvents: 'none',
                          },
                          '&.Mui-checked': {
                            color: 'var(--blue-500)',
                          },
                        }}
                      />
                    </EnhancedTooltipWithText>
                  </div>

                  {/* Section 2: Data */}
                  <div className={styles.dataSection}>
                    <div className={styles.resumeInfo}>
                      <div className={styles.resumeNameRow}>
                        <p className={styles.resumeName}>{resume.fileName}</p>
                        <span className={styles.resumeMeta}>
                          {formatFileSize(resume.activeVersionFileSize)}
                        </span>
                      </div>
                      <div className={styles.resumeDetails}>
                        <span className={styles.resumeVersions}>
                          {resume.versionsCount || 0} version{resume.versionsCount !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.resumeDate}>
                          Updated: {formatDate(resume.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Action buttons */}
                  <div className={styles.actionsSection}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.arrow}`}
                      onClick={() => onSelectResume(resume)}
                    >
                      <ArrowForward sx={{ fontSize: '1.25rem' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom sentinel for scroll down detection */}
          <div ref={bottomSentinelRef} className={styles.sentinel}>
            {state.isFetchingNext && (
              <div className={styles.sentinelLoader}>
                <CircularProgress size={20} sx={{ color: 'var(--blue-500)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {state.isError && state.resumes.length > 0 && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load more resumes. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={handleRetry}
            startIcon={<Refresh fontSize="small" />}
          />
        </div>
      )}
    </div>
  );
}
