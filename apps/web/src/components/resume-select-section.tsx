import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './style/job-ats-tab.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { SearchBar } from './search-bar';
import { ResumeCard } from './resume-card';
import { useResumes } from '../hooks/use-resumes';
import type { PaginatedResumeListItem } from '@repo/shared-types';

interface ResumeSelectSectionProps {
  personaId: string;
  onSelect: (resume: PaginatedResumeListItem) => void;
  selectedResumeId: string | null;
}

export function ResumeSelectSection({
  personaId,
  onSelect,
  selectedResumeId,
}: ResumeSelectSectionProps) {
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
  } = useResumes(personaId, 10, debouncedSearch);

  const resumes = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

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
            const resumeCards = scrollContainer.querySelectorAll('[data-resume-id]');

            if (resumeCards.length > 0) {
              const containerRect = scrollContainer.getBoundingClientRect();
              let firstVisibleElement: Element | null = null;
              let firstVisibleElementOffset = 0;

              for (let i = 0; i < resumeCards.length; i++) {
                const card = resumeCards.item(i);
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
                  firstVisibleElementId: firstVisibleElement.getAttribute('data-resume-id'),
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

      pendingScrollRestoreRef.current = null;
    }
  }, [isFetchingPreviousPage, resumes.length]);

  const handleNavigate = (resume: PaginatedResumeListItem) => {
    onSelect(resume);
  };

  return (
    <>
      <div className={styles.searchContainer}>
        <SearchBar placeholder="Search resumes..." value={searchQuery} onChange={setSearchQuery} />
      </div>
      {isLoading ? (
        <p className={styles.loadingText}>Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <p className={styles.emptyText}>No resumes found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {resumes.map((resume) => (
              <div key={resume.id} data-resume-id={resume.id}>
                <ResumeCard
                  resume={resume}
                  isSelected={selectedResumeId === resume.id}
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
          <p className={styles.errorText}>Failed to load resumes. Please try again.</p>
        </div>
      )}
    </>
  );
}
