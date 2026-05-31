import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './style/job-ats-tab.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { SearchBar } from './search-bar';
import { ResumeVersionCard } from './resume-version-card';
import { useResumeVersions, useViewParsedData } from '../hooks/use-resume-versions';
import type { ResumeVersionMetadata, ResumeData } from '@repo/shared-types';

interface VersionSelectSectionProps {
  resumeId: string;
  personaId: string;
  onSelect: (version: ResumeVersionMetadata) => void;
  selectedVersionId: string | null;
}

export function VersionSelectSection({
  resumeId,
  personaId,
  onSelect,
  selectedVersionId,
}: VersionSelectSectionProps) {
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
  } = useResumeVersions(resumeId, personaId, 10, debouncedSearch);

  const versions = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = useRef<{
    firstVisibleElementId: string | null;
    firstVisibleElementOffset: number;
  } | null>(null);

  const viewParsedDataMutation = useViewParsedData();

  const handleFetchParsedData = async (
    resumeId: string,
    versionId: string
  ): Promise<ResumeData | null> => {
    try {
      const result = await viewParsedDataMutation.mutateAsync({
        resumeId,
        versionId,
      });
      return result;
    } catch {
      return null;
    }
  };

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
            const versionCards = scrollContainer.querySelectorAll('[data-version-id]');

            if (versionCards.length > 0) {
              const containerRect = scrollContainer.getBoundingClientRect();
              let firstVisibleElement: Element | null = null;
              let firstVisibleElementOffset = 0;

              for (let i = 0; i < versionCards.length; i++) {
                const card = versionCards.item(i);
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
                  firstVisibleElementId: firstVisibleElement.getAttribute('data-version-id'),
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

      pendingScrollRestoreRef.current = null;
    }
  }, [isFetchingPreviousPage, versions.length]);

  const handleSetActive = (version: ResumeVersionMetadata) => {
    onSelect(version);
  };

  return (
    <>
      <div className={styles.searchContainer}>
        <SearchBar placeholder="Search versions..." value={searchQuery} onChange={setSearchQuery} />
      </div>
      {isLoading ? (
        <p className={styles.loadingText}>Loading versions...</p>
      ) : versions.length === 0 ? (
        <p className={styles.emptyText}>No versions found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {versions.map((version, index) => (
              <div key={version.id} data-version-id={version.id}>
                <ResumeVersionCard
                  version={version}
                  resumeId={resumeId}
                  previousVersion={versions[index + 1] || null}
                  isSelected={selectedVersionId === version.id}
                  onSetActive={handleSetActive}
                  onFetchParsedData={handleFetchParsedData}
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
          <p className={styles.errorText}>Failed to load versions. Please try again.</p>
        </div>
      )}
    </>
  );
}
