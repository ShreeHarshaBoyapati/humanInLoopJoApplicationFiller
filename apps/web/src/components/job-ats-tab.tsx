import { useState, useRef, useEffect, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import styles from './style/job-ats-tab.module.css';
import sectionStyles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedButton } from '@repo/ui';
import { SearchBar } from './search-bar';
import { ResultCard } from './result-card';
import { ResultDetailView } from './result-detail-view';
import { useResults, useResultDetail } from '../hooks/use-results';
import type { PaginatedResultListItem } from '@repo/shared-types';
import { PageHeader } from './page-header';

interface JobAtsTabProps {
  jobId: string;
}

export function JobAtsTab({ jobId }: JobAtsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [viewingResultDetail, setViewingResultDetail] = useState(false);

  // Debounce search query
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
  } = useResults(jobId, 10, debouncedSearch);

  const results = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

  // Fetch detailed result when viewing
  const {
    data: resultDetail,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useResultDetail(selectedResultId || '', viewingResultDetail);

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
          // Capture the first visible element BEFORE fetching previous page
          if (scrollContainer) {
            const resultCards = scrollContainer.querySelectorAll('[data-result-id]');

            if (resultCards.length > 0) {
              const containerRect = scrollContainer.getBoundingClientRect();
              let firstVisibleElement: Element | null = null;
              let firstVisibleElementOffset = 0;

              for (let i = 0; i < resultCards.length; i++) {
                const card = resultCards.item(i);
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
                  firstVisibleElementId: firstVisibleElement.getAttribute('data-result-id'),
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

  // Restore scroll position after fetching previous page completes
  useEffect(() => {
    if (!isFetchingPreviousPage && pendingScrollRestoreRef.current && scrollContainerRef.current) {
      const { firstVisibleElementId, firstVisibleElementOffset } = pendingScrollRestoreRef.current;

      // Find the element by its result id
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-result-id="${firstVisibleElementId}"]`
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
  }, [isFetchingPreviousPage, results.length]);

  const handleSelectResult = (result: PaginatedResultListItem) => {
    setSelectedResultId(result.id);
    setViewingResultDetail(false);
  };

  const handleViewResume = (result: PaginatedResultListItem) => {
    // TODO: Navigate to resume view or open in new tab
    console.log('View resume:', result.resumeVersionId);
  };

  const handleViewResult = (result: PaginatedResultListItem) => {
    setSelectedResultId(result.id);
    setViewingResultDetail(true);
  };

  const handleBackToList = () => {
    setViewingResultDetail(false);
  };

  const handleAddResult = () => {
    // TODO: Open modal to add a new result
    console.log('Add result');
  };

  // Show detail view when viewing a result
  if (viewingResultDetail && selectedResultId) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        {/* Header without button */}
        <PageHeader title="ATS Results" headerProps={{ className: styles.header }} />

        {/* Navigation */}
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={handleBackToList}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Result</span>
        </div>

        <ResultDetailView
          result={resultDetail || null}
          isLoading={isLoadingDetail}
          error={detailError?.message}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Header with title and add button */}
      <PageHeader
        title="ATS Results"
        buttonLabel="Add Result"
        onButtonClick={handleAddResult}
        buttonIcon={<AddIcon fontSize="small" />}
        headerProps={{ className: styles.header }}
      />

      {/* Navigation */}
      <div className={styles.navigation}>
        <span className={sectionStyles.navCurrent}>ATS History</span>
      </div>

      {/* Search bar */}
      <div className={styles.searchContainer}>
        <SearchBar placeholder="Search results..." value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Results list */}
      {isLoading ? (
        <p className={styles.loadingText}>Loading results...</p>
      ) : results.length === 0 ? (
        <p className={styles.emptyText}>No results found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          {/* Top sentinel for scroll up detection */}
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {results.map((result) => (
              <div key={result.id} data-result-id={result.id}>
                <ResultCard
                  result={result}
                  isSelected={selectedResultId === result.id}
                  onSelect={handleSelectResult}
                  onViewResume={handleViewResume}
                  onViewResult={handleViewResult}
                />
              </div>
            ))}
          </div>

          {/* Bottom sentinel for scroll down detection */}
          <div ref={bottomSentinelRef} className={styles.sentinel} />

          {(isFetchingNextPage || isFetchingPreviousPage) && (
            <p className={styles.loadingText}>Loading...</p>
          )}
        </div>
      )}

      {isError && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load results. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={() => refetch()}
            startIcon={<RefreshIcon fontSize="small" />}
          />
        </div>
      )}
    </div>
  );
}
