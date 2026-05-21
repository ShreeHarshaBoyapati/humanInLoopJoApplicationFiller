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

const MAX_PAGES = 10;

// Pagination state type
type PaginationState = {
  personas: Persona[];
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

        let newPersonas = [...state.personas, ...items];
        let newFirstPage = state.firstPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const firstPageSize = state.pageSizes.get(state.firstPage) || 0;
          newPersonas = newPersonas.slice(firstPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.firstPage);
          newFirstPage = state.firstPage + 1;
        }

        return {
          ...state,
          personas: newPersonas,
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

        let newPersonas = [...items, ...state.personas];
        let newLastPage = state.lastPage;
        let newPageSizesAfterEviction = newPageSizes;

        const pageCount = state.lastPage - state.firstPage + 1;
        if (pageCount >= MAX_PAGES) {
          const lastPageSize = state.pageSizes.get(state.lastPage) || 0;
          newPersonas = newPersonas.slice(0, newPersonas.length - lastPageSize);
          newPageSizesAfterEviction = new Map(newPageSizes);
          newPageSizesAfterEviction.delete(state.lastPage);
          newLastPage = state.lastPage - 1;
        }

        return {
          ...state,
          personas: newPersonas,
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
        personas: items,
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
        personas: state.personas.map((p) => ({
          ...p,
          active: p.id === action.id,
        })),
      };

    default:
      return state;
  }
}

interface PersonasSectionProps {
  onSelectPersona?: (personaId: string) => void;
  isFromAutofill?: boolean;
}

export function PersonasSection({ onSelectPersona, isFromAutofill = false }: PersonasSectionProps) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(paginationReducer, initialState);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;

  // Cache hook
  const { getPage, setPage } = usePersonasCache();

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

  const fetchPersonas = useCallback(
    async (pageNum: number, search?: string, direction?: 'next' | 'previous') => {
      if (typeof chrome === 'undefined' || !chrome.runtime) return;

      // Capture the first visible element BEFORE fetching previous page
      if (direction === 'previous' && scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const personaCards = scrollContainer.querySelectorAll('[data-persona-id]');

        if (personaCards.length > 0) {
          const containerRect = scrollContainer.getBoundingClientRect();
          let firstVisibleElement: Element | null = null;
          let firstVisibleElementOffset = 0;

          for (let i = 0; i < personaCards.length; i++) {
            const card = personaCards.item(i);
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
              firstVisibleElementId: firstVisibleElement.getAttribute('data-persona-id'),
              firstVisibleElementOffset: firstVisibleElementOffset,
            };
          }
        }
      }

      dispatch({ type: 'FETCH_START', direction });

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
          } else {
            dispatch({ type: 'FETCH_ERROR', direction });
          }
        }
      );
    },
    [getPage, setPage]
  );

  // Restore scroll position after fetching previous page completes
  useEffect(() => {
    if (
      !state.isFetchingPrevious &&
      pendingScrollRestoreRef.current &&
      scrollContainerRef.current
    ) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;

      // Find the element by its persona id
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-persona-id="${firstVisibleElementId}"]`
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
  }, [state.isFetchingPrevious, state.personas.length]);

  // Initial fetch and search
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchPersonas(1, searchQuery);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
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
    if (isFromAutofill && onSelectPersona) {
      onSelectPersona(persona.id);
    } else {
      navigate({
        to: '/resume',
        search: {
          personaId: persona.id,
          title: persona.title,
          from: '/personas',
        },
      });
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`${styles.sectionContainer}`}>
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
        {isFromAutofill ? (
          <>
            <span
              className={styles.navLink}
              onClick={() => navigate({ to: '/autofill', search: { step: 1 } })}
            >
              Step 2
            </span>
            <span className={styles.navSeparator}>/</span>
            <span className={styles.navCurrent}>All Personas</span>
          </>
        ) : (
          <span className={styles.navCurrent}>All Personas</span>
        )}
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
                  data-persona-id={persona.id}
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
