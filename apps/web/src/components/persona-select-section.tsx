import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './style/job-ats-tab.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { SearchBar } from './search-bar';
import { PersonaCard } from './persona-card';
import { usePersonas } from '../hooks/use-personas';
import type { Persona } from '@repo/shared-types';

interface PersonaSelectSectionProps {
  onSelect: (persona: Persona) => void;
  selectedPersonaId: string | null;
}

export function PersonaSelectSection({ onSelect, selectedPersonaId }: PersonaSelectSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
  } = usePersonas(10, debouncedSearch);

  const personas = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

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
          if (scrollContainer) {
            const personaCards = scrollContainer.querySelectorAll('[data-persona-id]');

            if (personaCards.length > 0) {
              const containerRect = scrollContainer.getBoundingClientRect();
              let firstVisibleElement: Element | null = null;
              let firstVisibleElementOffset = 0;

              for (let i = 0; i < personaCards.length; i++) {
                const card = personaCards.item(i);
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
                  firstVisibleElementId: firstVisibleElement.getAttribute('data-persona-id'),
                  firstVisibleElementOffset: firstVisibleElementOffset,
                };
              }
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

      pendingScrollRestoreRef.current = null;
    }
  }, [isFetchingPreviousPage, personas.length]);

  const handleNavigate = (persona: Persona) => {
    onSelect(persona);
  };

  return (
    <>
      <div className={styles.searchContainer}>
        <SearchBar placeholder="Search personas..." value={searchQuery} onChange={setSearchQuery} />
      </div>
      {isLoading ? (
        <p className={styles.loadingText}>Loading personas...</p>
      ) : personas.length === 0 ? (
        <p className={styles.emptyText}>No personas found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {personas.map((persona) => (
              <div key={persona.id} data-persona-id={persona.id}>
                <PersonaCard
                  persona={persona}
                  isSelected={selectedPersonaId === persona.id}
                  onNavigate={handleNavigate}
                  hideRadio={true}
                  hideActions={true}
                />
              </div>
            ))}
          </div>

          <div ref={bottomSentinelRef} className={styles.sentinel} />

          {(isFetchingNextPage || isFetchingPreviousPage) && (
            <p className={styles.loadingText}>Loading...</p>
          )}
        </div>
      )}
      {isError && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load personas. Please try again.</p>
        </div>
      )}
    </>
  );
}
