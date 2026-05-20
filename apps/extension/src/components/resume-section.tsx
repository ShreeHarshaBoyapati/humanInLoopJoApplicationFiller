import { useEffect, useState, useReducer, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Radio, CircularProgress } from '@mui/material';
import { ArrowForward, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import styles from '../routes/style/resume.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedTextField, EnhancedTooltipWithText } from '@repo/ui';
import type { PaginatedResumeListItem, PaginatedResumeResponse } from '@repo/shared-types';
import { useResumesCache } from '../hooks/use-resumes-cache';

// Pagination state type
type PaginationState = {
  resumes: PaginatedResumeListItem[];
  firstPage: number;
  lastPage: number;
  totalPages: number;
  isInitialLoading: boolean;
  isFetchingNext: boolean;
  isFetchingPrevious: boolean;
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
  | { type: 'FETCH_ERROR'; direction?: 'next' | 'previous' }
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
        return {
          ...state,
          resumes: [...state.resumes, ...items],
          lastPage: page,
          totalPages,
          isFetchingNext: false,
          isInitialLoading: false,
        };
      } else if (direction === 'previous') {
        return {
          ...state,
          resumes: [...items, ...state.resumes],
          firstPage: page,
          totalPages,
          isFetchingPrevious: false,
          isInitialLoading: false,
        };
      }
      // Initial fetch
      return {
        ...state,
        resumes: items,
        firstPage: page,
        lastPage: page,
        totalPages,
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
  onSelectResume: (resumeId: string) => void;
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
  const previousScrollHeightRef = useRef<number>(0);

  // Derived values
  const hasPreviousPage = state.firstPage > 1;
  const hasNextPage = state.lastPage < state.totalPages;

  const fetchResumes = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      dispatch({ type: 'FETCH_START', direction });

      // Store scroll height before prepending
      if (direction === 'previous' && scrollContainerRef.current) {
        previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      }

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

        // Restore scroll position after prepending
        if (direction === 'previous') {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const contentAdded =
                scrollContainerRef.current.scrollHeight - previousScrollHeightRef.current;
              scrollContainerRef.current.scrollTop += contentAdded;
            }
          });
        }
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

            // Restore scroll position after prepending
            if (direction === 'previous') {
              requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                  const contentAdded =
                    scrollContainerRef.current.scrollHeight - previousScrollHeightRef.current;
                  scrollContainerRef.current.scrollTop += contentAdded;
                }
              });
            }
          } else {
            dispatch({ type: 'FETCH_ERROR', direction });
          }
        }
      );
    },
    [getPage, setPage, personaId]
  );

  // Initial fetch and search
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchResumes(1, searchQuery);
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
          !state.isInitialLoading
        ) {
          fetchResumes(state.firstPage - 1, searchQuery, 'previous');
        }

        if (
          bottomEntry?.isIntersecting &&
          hasNextPage &&
          !state.isFetchingNext &&
          !state.isInitialLoading
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
    state.firstPage,
    state.lastPage,
    searchQuery,
  ]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
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
                          Updated {formatDate(resume.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Action buttons */}
                  <div className={styles.actionsSection}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.arrow}`}
                      onClick={() => onSelectResume(resume.id)}
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
    </div>
  );
}
