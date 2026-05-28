import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { PageHeader } from './page-header';
import { SearchBar } from './search-bar';
import { JobTrackerCard } from './job-tracker-card';
import { EnhancedSelectDropdown, EnhancedAutocompleteDropdown } from '@repo/ui';
import type { AutocompleteOption } from '@repo/ui';
import type { Job, PaginatedJobsResponse, Persona } from '@repo/shared-types';
import { useJobs, useUpdateJob } from '../hooks/use-jobs';
import { usePersonas } from '../hooks/use-personas';
import { useStore } from '../store';
import { AddApplicationModal } from './add-application-modal';
import styles from './style/job-tracker-section.module.css';
import sectionStyles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';

type TabType = 'active' | 'archived';

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

export function JobTrackerSection() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
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

  const updateJob = useUpdateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

  // Fetch personas for the dropdown with search
  const { data: personasData } = usePersonas(50, debouncedPersonaSearch);

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
  const statusFilter = activeTab === 'active' ? 'active' : 'archived';

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
    const options = [{ value: '', label: 'All Personas' }];
    if (personasData?.pages) {
      const allPersonas = personasData.pages.flatMap((page) => page.items) as Persona[];
      allPersonas.forEach((persona) => {
        options.push({ value: persona.id, label: persona.title });
      });
    }
    return options;
  }, [personasData]);

  // Scroll position restoration for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);

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
          const currentScrollTop = scrollContainer.scrollTop;
          previousScrollHeightRef.current = scrollContainer.scrollHeight;

          fetchPreviousPage().then(() => {
            if (scrollContainer) {
              const contentAdded = scrollContainer.scrollHeight - previousScrollHeightRef.current;
              scrollContainer.scrollTop = currentScrollTop + contentAdded;
            }
          });
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

  return (
    <div className={`${sectionStyles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Header */}
      <PageHeader
        title="Job Tracker"
        buttonLabel="Add Application"
        onButtonClick={handleAddApplication}
        buttonIcon={<AddIcon fontSize="small" />}
      />

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'active' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('active');
            setSearchQuery('');
            setDebouncedSearch('');
          }}
        >
          Active
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'archived' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('archived');
            setSearchQuery('');
            setDebouncedSearch('');
          }}
        >
          Archived
        </button>
      </div>

      {/* Filters Row */}
      <div className={styles.filtersRow}>
        <div className={styles.searchWrapper}>
          <SearchBar placeholder="Search jobs..." value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className={styles.filterGroup}>
          <EnhancedAutocompleteDropdown
            id="persona-filter"
            testId="persona-filter"
            placeholder="Search personas..."
            options={personaOptions as AutocompleteOption[]}
            value={selectedPersonaOption}
            onChange={(newValue) => {
              setSelectedPersonaOption(newValue);
              setSelectedPersona((newValue?.value as string) || '');
            }}
            onInputChange={(inputValue) => {
              setPersonaSearchQuery(inputValue);
            }}
          />
        </div>
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
          {/* Top sentinel for scroll up detection */}
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
              />
            ))}
          </div>

          {/* Bottom sentinel for scroll down detection */}
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
          <button type="button" onClick={() => refetch()} className={sectionStyles.retryButton}>
            <RefreshIcon fontSize="small" />
            Retry
          </button>
        </div>
      )}

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleJobCreated}
      />
    </div>
  );
}
