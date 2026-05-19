import { useEffect, useState, useReducer, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Radio, CircularProgress } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import styles from '../routes/style/personas.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedTextField, EnhancedTooltipWithText } from '@repo/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Persona, PaginatedPersonasResponse } from '@repo/shared-types';
import { usePersonasCache } from '../hooks/use-personas-cache';

// Pagination state type
type PaginationState = {
  personas: Persona[];
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
      items: Persona[];
      page: number;
      totalPages: number;
      direction?: 'next' | 'previous';
    }
  | { type: 'FETCH_ERROR'; direction?: 'next' | 'previous' }
  | { type: 'RESET' }
  | { type: 'SET_ACTIVE'; id: string };

// Initial state
const initialState: PaginationState = {
  personas: [],
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
          personas: [...state.personas, ...items],
          lastPage: page,
          totalPages,
          isFetchingNext: false,
          isInitialLoading: false,
        };
      } else if (direction === 'previous') {
        return {
          ...state,
          personas: [...items, ...state.personas],
          firstPage: page,
          totalPages,
          isFetchingPrevious: false,
          isInitialLoading: false,
        };
      }
      // Initial fetch
      return {
        ...state,
        personas: items,
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
        personas: state.personas.map((p) => ({
          ...p,
          active: p.id === action.id,
        })),
      };

    default:
      return state;
  }
}

export function PersonasSection() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(paginationReducer, initialState);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;

  // Cache hook
  const { getPage, setPage, invalidateCache, tokenChanged, resetTokenChanged } = usePersonasCache();

  // Refs for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);

  // Derived values
  const hasPreviousPage = state.firstPage > 1;
  const hasNextPage = state.lastPage < state.totalPages;

  // Reset on token change
  useEffect(() => {
    if (tokenChanged) {
      dispatch({ type: 'RESET' });
      resetTokenChanged();
    }
  }, [tokenChanged, resetTokenChanged]);

  const fetchPersonas = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      dispatch({ type: 'FETCH_START', direction });

      // Store scroll height before prepending
      if (direction === 'previous' && scrollContainerRef.current) {
        previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      }

      // Try to get from cache first
      const cachedData = await getPage(pageNum, search || '');
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
          action: 'GET_PERSONAS',
          payload: { page: pageNum, limit, search: search || '' },
        },
        (res: { success: boolean; data?: PaginatedPersonasResponse; error?: string }) => {
          if (res?.success && res.data) {
            // Store in cache
            setPage(res.data, search || '');

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
    [getPage, setPage]
  );

  // Initial fetch and search
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchPersonas(1, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
          fetchPersonas(state.firstPage - 1, searchQuery, 'previous');
        }

        if (
          bottomEntry?.isIntersecting &&
          hasNextPage &&
          !state.isFetchingNext &&
          !state.isInitialLoading
        ) {
          fetchPersonas(state.lastPage + 1, searchQuery, 'next');
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
    fetchPersonas,
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

  const handleNavigateToResumes = (persona: Persona) => {
    navigate({
      to: '/resume',
      search: {
        personaId: persona.id,
        title: persona.title,
        from: '/personas',
      },
    });
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`${styles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Personas</h1>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <p className={styles.infoText}>
          To create, edit, or delete personas, please use the{' '}
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
        <span className={styles.navCurrent}>All Personas</span>
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <EnhancedTextField
          label=""
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or keyword"
        />
      </div>

      {/* Persona List */}
      {state.isInitialLoading && state.personas.length === 0 ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} sx={{ color: 'var(--blue-500)' }} />
        </div>
      ) : state.personas.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery ? 'No personas match your search.' : 'No personas found.'}
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

          <div className={styles.personaList}>
            {state.personas.map((persona) => {
              const radioTooltip = persona.active
                ? 'Active (set via resume version)'
                : 'Set a resume version as active to make this persona active';

              return (
                <div
                  key={persona.id}
                  className={`${styles.personaCard} ${persona.active ? styles.selected : ''}`}
                >
                  {/* Section 1: Radio button with tooltip */}
                  <div className={styles.radioSection}>
                    <EnhancedTooltipWithText
                      description={radioTooltip}
                      showIcon={false}
                      placement="top"
                    >
                      <Radio
                        checked={persona.active}
                        disabled
                        sx={{
                          color: 'var(--grey-500)',
                          '&.Mui-disabled': {
                            color: persona.active ? 'var(--blue-500)' : 'var(--grey-500)',
                            pointerEvents: 'none',
                          },
                          '&.Mui-checked': {
                            color: 'var(--blue-500)',
                          },
                        }}
                      />
                    </EnhancedTooltipWithText>
                  </div>

                  {/* Section 2: Data (icon, title, resumes, keywords) */}
                  <div className={styles.dataSection}>
                    <div className={styles.personaIcon}>{getInitials(persona.title)}</div>
                    <div className={styles.personaInfo}>
                      <div className={styles.personaNameRow}>
                        <p className={styles.personaName}>{persona.title}</p>
                        <span className={styles.personaResumesCount}>
                          {persona.resumesCount || 0} resumes
                        </span>
                      </div>
                      <p className={styles.personaSummary}>
                        {persona.keywords?.join(', ') || 'No keywords'}
                      </p>
                    </div>
                  </div>

                  {/* Section 3: Action buttons */}
                  <div className={styles.actionsSection}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.arrow}`}
                      onClick={() => handleNavigateToResumes(persona)}
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
