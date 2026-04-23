import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowBack } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import styles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import '@repo/ui/constants/css-constants.css';
import { PageHeader } from './page-header';
import { SearchBar } from './search-bar';
import { ResumeCard } from './resume-card';
import { ConfirmModal } from './confirm-modal';
import {
  useResumes,
  useSetActiveResume,
  useDeleteResume,
  type PaginatedResumeResponse,
} from '../hooks/use-resumes';
import type { Persona, ResumeMetadata } from '@repo/shared-types';

interface ResumeSectionProps {
  persona: Persona;
  onBack: () => void;
  onSelectResume: (resume: ResumeMetadata) => void;
}

export function ResumeSection({ persona, onBack, onSelectResume }: ResumeSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);

  const deleteResume = useDeleteResume();
  const setActiveResume = useSetActiveResume();

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
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useResumes(persona.id, 10, debouncedSearch);

  const resumes = useMemo(
    () => data?.pages.flatMap((page: PaginatedResumeResponse) => page.items) || [],
    [data]
  );

  // Set the active resume as selected when data loads
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const activeResume = resumes.find((resume: ResumeMetadata) => resume.active);
      if (activeResume) {
        setSelectedResumeId(activeResume.id);
      }
    }
  }, [resumes, selectedResumeId]);

  // Scroll to top when data changes (for previous page)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!scrollContainer || !topSentinel || !bottomSentinel) return;

    const scrollObserver = new IntersectionObserver(
      (entries) => {
        const topEntry = entries.find((e) => e.target === topSentinel);
        const bottomEntry = entries.find((e) => e.target === bottomSentinel);

        // Scroll up - load previous page
        if (topEntry?.isIntersecting && hasPreviousPage && !isFetchingPreviousPage) {
          fetchPreviousPage().then(() => {
            // Scroll down a bit to show we're still at the top
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight / 4;
            }
          });
        }

        // Scroll down - load next page
        if (bottomEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
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
  ]);

  const handleSetActiveResume = (resume: ResumeMetadata) => {
    setSelectedResumeId(resume.id);
    if (!resume.active) {
      setActiveResume.mutate(resume.id);
    }
  };

  const handleAddResume = () => {
    // TODO: Implement add resume functionality
    console.log('Add resume clicked');
  };

  const handleEditClick = (resume: ResumeMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Edit clicked for resume:', resume);
  };

  const handleDeleteClick = (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteResumeId(resumeId);
  };

  const handleDeleteConfirm = () => {
    if (deleteResumeId) {
      deleteResume.mutate(
        { id: deleteResumeId },
        {
          onSuccess: () => {
            setDeleteResumeId(null);
            if (selectedResumeId === deleteResumeId) {
              setSelectedResumeId(null);
            }
          },
        }
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeleteResumeId(null);
  };

  return (
    <div className={`${styles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Box 1: Header */}
      <PageHeader
        title="Resumes"
        buttonLabel="Add Resume"
        onButtonClick={handleAddResume}
        buttonIcon={<AddIcon fontSize="small" />}
      />

      {/* Box 2: Navigation */}
      <div className={styles.navigation}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowBack sx={{ fontSize: '1rem' }} />
        </button>
        <span className={styles.navTextBlue} onClick={onBack}>
          All Personas
        </span>
        <span className={styles.navSeparator}>/</span>
        <span className={styles.navCurrent}>Resumes</span>
      </div>

      {/* Box 3: Search */}
      <SearchBar placeholder="Search resumes..." value={searchQuery} onChange={setSearchQuery} />

      {/* Box 4: Resume cards list */}
      {isLoading ? (
        <p className={styles.loadingText}>Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <p className={styles.emptyText}>No resumes found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          {/* Top sentinel for scroll up detection */}
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {resumes.map((resume: ResumeMetadata) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                isSelected={selectedResumeId === resume.id}
                onSetActive={handleSetActiveResume}
                onNavigate={onSelectResume}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>

          {/* Bottom sentinel for scroll down detection */}
          <div ref={bottomSentinelRef} className={styles.sentinel} />

          {(isFetchingNextPage || isFetchingPreviousPage) && (
            <p className={styles.loadingText}>Loading...</p>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteResumeId}
        title="Delete Resume"
        message="Are you sure you want to delete this resume? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
