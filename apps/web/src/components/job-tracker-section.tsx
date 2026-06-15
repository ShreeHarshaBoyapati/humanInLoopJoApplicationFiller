import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { PageHeader } from './page-header';
import { SearchBar } from './search-bar';
import { JobTrackerCard } from './job-tracker-card';
import { JobDetailSidebar } from './job-detail-sidebar';
import { BigCalendarPanel } from './big-calendar-panel';
import { useEnsureTaskTag } from '../hooks/use-tags';
import { EnhancedSelectDropdown, EnhancedAutocompleteDropdown, EnhancedButton } from '@repo/ui';
import type { AutocompleteOption } from '@repo/ui';
import type { Job, PaginatedJobsResponse, Persona } from '@repo/shared-types';
import { useJobs, useUpdateJob } from '../hooks/use-jobs';
import { usePersonas } from '../hooks/use-personas';
import { useStore } from '../store';
import { AddApplicationModal } from './add-application-modal';
import styles from './style/job-tracker-section.module.css';
import sectionStyles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';

type TabType = 'active' | 'archived' | 'calendar';

const STATUS_STEPS = ['Draft', 'Applied', 'Interview', 'Offer', 'Rejected'];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'acceptanceLevel', label: 'Acceptance Level' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'DESC', label: 'Descending' },
  { value: 'ASC', label: 'Ascending' },
];

const MOBILE_BREAKPOINT = 1024;
const PERSONA_FILTER_LIMIT = 50;

export function JobTrackerSection() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedPersonaOption, setSelectedPersonaOption] = useState<AutocompleteOption | null>(
    null
  );
  const [personaSearchQuery, setPersonaSearchQuery] = useState('');
  const [debouncedPersonaSearch, setDebouncedPersonaSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const updateJob = useUpdateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);
  useEnsureTaskTag();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile && activeTab === 'calendar') {
      setActiveTab('active');
    }
  }, [isMobile, activeTab]);

  // Fetch personas for the dropdown with search
  const { data: personasData, isFetching: isFetchingPersonas } = usePersonas(
    PERSONA_FILTER_LIMIT,
    debouncedPersonaSearch
  );

  const isPersonaListLoading =
    isFetchingPersonas || (debouncedPersonaSearch === '' && !personasData);
  const personaTotal = personasData?.pages[0]?.total ?? 0;
  const isPersonaListTruncated = personaTotal > PERSONA_FILTER_LIMIT;

  // Debounce job search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce persona search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPersonaSearch(personaSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [personaSearchQuery]);

  // Determine status filter based on tab
  const statusFilter = activeTab === 'archived' ? 'archived' : 'active';

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
  } = useJobs({
    limit: 10,
    searchQuery: debouncedSearch,
    status: statusFilter,
    persona: selectedPersona || undefined,
    favorite: showFavoritesOnly ? true : undefined,
    sortBy: sortBy as 'createdAt' | 'updatedAt' | 'acceptanceLevel',
    sortOrder: sortOrder as 'ASC' | 'DESC',
  });

  const jobs = useMemo(
    () => data?.pages.flatMap((page: PaginatedJobsResponse) => page.items) || [],
    [data]
  );

  // Build persona options from fetched personas
  const personaOptions = useMemo(() => {
    const options: AutocompleteOption[] = [];
    if (personaSearchQuery === '') {
      options.push({ value: '', label: 'All Personas' });
    }
    if (personasData?.pages) {
      const allPersonas = personasData.pages.flatMap((page) => page.items) as Persona[];
      allPersonas.forEach((persona) => {
        options.push({ value: persona.id, label: persona.title });
      });
    }
    return options;
  }, [personasData, personaSearchQuery]);

  // Scroll position restoration for infinite scroll
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
            const jobCards = scrollContainer.querySelectorAll('[data-job-id]');

            if (jobCards.length > 0) {
              const containerRect = scrollContainer.getBoundingClientRect();
              let firstVisibleElement: Element | null = null;
              let firstVisibleElementOffset = 0;

              for (let i = 0; i < jobCards.length; i++) {
                const card = jobCards.item(i);
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
                  firstVisibleElementId: firstVisibleElement.getAttribute('data-job-id'),
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

      const targetElement = scrollContainerRef.current.querySelector(
        `[data-job-id="${firstVisibleElementId}"]`
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
  }, [isFetchingPreviousPage, jobs.length]);

  const handleFavoriteToggle = useCallback(
    (job: Job) => {
      updateJob.mutate(
        { id: job.id, favorite: !job.favorite },
        {
          onError: (error) => {
            showSnackbar(error instanceof Error ? error.message : 'Failed to update favorite', {
              severity: 'error',
            });
          },
        }
      );
    },
    [updateJob, showSnackbar]
  );

  const handleStatusChange = useCallback(
    (job: Job, newStatus: string) => {
      updateJob.mutate(
        { id: job.id, status: newStatus },
        {
          onError: (error) => {
            showSnackbar(error instanceof Error ? error.message : 'Failed to update status', {
              severity: 'error',
            });
          },
        }
      );
    },
    [updateJob, showSnackbar]
  );

  const handleAddApplication = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleJobCreated = () => {
    refetch();
  };

  const handleJobClick = useCallback((job: Job) => {
    setSelectedJob(job);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedJob(null);
  }, []);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'calendar') {
      setSearchQuery('');
      setDebouncedSearch('');
    }
  };

  const showJobList = !isMobile || activeTab !== 'calendar';
  const showCalendarInMain = isMobile && activeTab === 'calendar';

  return (
    <div className={`${sectionStyles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      <div className={styles.splitLayout}>
        <div className={styles.leftPane}>
          {/* Header */}
          <PageHeader
            title="Job Tracker"
            buttonLabel="Add Job"
            onButtonClick={handleAddApplication}
            buttonIcon={<AddIcon fontSize="small" />}
            headerProps={{ style: { width: '100%' } }}
          />
          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'active' ? styles.active : ''}`}
              onClick={() => handleTabClick('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'archived' ? styles.active : ''}`}
              onClick={() => handleTabClick('archived')}
            >
              Archived
            </button>
            {isMobile && (
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'calendar' ? styles.active : ''}`}
                onClick={() => handleTabClick('calendar')}
              >
                Calendar
              </button>
            )}
          </div>

          {showJobList && (
            <>
              {/* Filters Row */}
              <div className={styles.filtersContainer}>
                <div className={styles.filtersRow}>
                  <div className={`${styles.searchWrapper} ${styles.searchWrapperFullWidth}`}>
                    <SearchBar
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={setSearchQuery}
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <EnhancedAutocompleteDropdown
                      id="persona-filter"
                      testId="persona-filter"
                      placeholder="Search personas..."
                      options={personaOptions as AutocompleteOption[]}
                      value={selectedPersonaOption}
                      loading={isPersonaListLoading}
                      loadingText="Loading personas..."
                      onChange={(newValue) => {
                        setSelectedPersonaOption(newValue);
                        setSelectedPersona((newValue?.value as string) || '');
                      }}
                      onInputChange={(inputValue) => {
                        setPersonaSearchQuery(inputValue);
                      }}
                      listboxFooter={
                        isPersonaListTruncated ? (
                          <span className={styles.personaFilterFooter}>
                            Showing first {PERSONA_FILTER_LIMIT} personas. Type to search for more.
                          </span>
                        ) : undefined
                      }
                    />
                  </div>
                </div>
                <div className={styles.filtersRow}>
                  <div className={styles.filterGroup}>
                    <EnhancedSelectDropdown
                      id="sort-by"
                      testId="sort-by"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as string)}
                      options={SORT_OPTIONS}
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <EnhancedSelectDropdown
                      id="sort-order"
                      testId="sort-order"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as string)}
                      options={SORT_ORDER_OPTIONS}
                    />
                  </div>
                  <button
                    type="button"
                    className={`${styles.favoriteToggleButton} ${showFavoritesOnly ? styles.active : ''}`}
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  >
                    {showFavoritesOnly ? (
                      <FavoriteIcon sx={{ fontSize: '1.25rem' }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ fontSize: '1.25rem' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Job Cards List */}
              {isLoading ? (
                <p className={sectionStyles.loadingText}>Loading jobs...</p>
              ) : jobs.length === 0 ? (
                <p className={sectionStyles.emptyText}>No jobs found</p>
              ) : (
                <div
                  className={`${sectionStyles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
                  ref={scrollContainerRef}
                >
                  <div ref={topSentinelRef} className={sectionStyles.sentinel} />

                  <div className={sectionStyles.itemList}>
                    {jobs.map((job: Job) => (
                      <JobTrackerCard
                        key={job.id}
                        job={job}
                        statusSteps={STATUS_STEPS}
                        isLoading={updateJob.isPending && updateJob.variables?.id === job.id}
                        onFavoriteToggle={handleFavoriteToggle}
                        onStatusChange={handleStatusChange}
                        onClick={handleJobClick}
                      />
                    ))}
                  </div>

                  <div ref={bottomSentinelRef} className={sectionStyles.sentinel} />

                  {(isFetchingNextPage || isFetchingPreviousPage) && (
                    <p className={sectionStyles.loadingText}>Loading...</p>
                  )}
                </div>
              )}

              {/* Error state with retry button */}
              {isError && (
                <div className={sectionStyles.errorContainer}>
                  <p className={sectionStyles.errorText}>Failed to load jobs. Please try again.</p>
                  <EnhancedButton
                    label="Retry"
                    colorTheme="secondary"
                    size="small"
                    onClick={() => refetch()}
                    startIcon={<RefreshIcon fontSize="small" />}
                  />
                </div>
              )}
            </>
          )}

          {showCalendarInMain && (
            <div
              className={`${styles.mobileCalendarWrapper} ${scrollbarStyles.scrollbarVerticalContainer}`}
            >
              <BigCalendarPanel />
            </div>
          )}
        </div>

        {!isMobile && (
          <div className={`${styles.rightPane} ${scrollbarStyles.scrollbarVerticalContainer}`}>
            <BigCalendarPanel />
          </div>
        )}
      </div>

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleJobCreated}
      />

      {/* Job Detail Sidebar */}
      {selectedJob && <JobDetailSidebar job={selectedJob} onClose={handleCloseSidebar} />}
    </div>
  );
}

export default JobTrackerSection;
