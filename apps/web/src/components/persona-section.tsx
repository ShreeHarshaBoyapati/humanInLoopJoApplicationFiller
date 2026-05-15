import { useState, useRef, useEffect, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import styles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import '@repo/ui/constants/css-constants.css';
import { EnhancedButton } from '@repo/ui';
import { PageHeader } from './page-header';
import { SearchBar } from './search-bar';
import { PersonaCard } from './persona-card';
import { CreatePersonaModal } from './create-persona-modal';
import { ConfirmModal } from './confirm-modal';
import {
  usePersonas,
  useSetActivePersona,
  useDeletePersona,
  type PaginatedPersonaResponse,
} from '../hooks/use-personas';
import type { Persona } from '@repo/shared-types';
import { useStore } from '../store';

interface PersonaSectionProps {
  onSelectPersona: (persona: Persona) => void;
}

export function PersonaSection({ onSelectPersona }: PersonaSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deletePersonaId, setDeletePersonaId] = useState<string | null>(null);

  const deletePersona = useDeletePersona();
  const setActivePersona = useSetActivePersona();
  const showSnackbar = useStore((state) => state.showSnackbar);

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
  } = usePersonas(10, debouncedSearch);

  const personas = useMemo(
    () => data?.pages.flatMap((page: PaginatedPersonaResponse) => page.items) || [],
    [data]
  );

  // Set the active persona as selected when data loads
  useEffect(() => {
    if (personas.length > 0 && !selectedPersonaId) {
      const activePersona = personas.find((persona: Persona) => persona.active);
      if (activePersona) {
        setSelectedPersonaId(activePersona.id);
      }
    }
  }, [personas, selectedPersonaId]);

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
          // Store current scroll state before prepending data
          const currentScrollTop = scrollContainer.scrollTop;
          previousScrollHeightRef.current = scrollContainer.scrollHeight;

          fetchPreviousPage().then(() => {
            // Restore scroll position to keep same content in view
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

  const handleSetActivePersona = (persona: Persona) => {
    if (!persona.active) {
      setActivePersona.mutate(persona.id, {
        onSuccess: (activePersona) => {
          setSelectedPersonaId(activePersona.id);
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to set active persona', {
            severity: 'error',
          });
        },
      });
    }
  };

  const handleAddPersona = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (persona: Persona, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPersona(persona);
  };

  const handleDeleteClick = (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletePersonaId(personaId);
  };

  const handleDeleteConfirm = () => {
    if (deletePersonaId) {
      deletePersona.mutate(
        { id: deletePersonaId },
        {
          onSuccess: () => {
            setDeletePersonaId(null);
            if (selectedPersonaId === deletePersonaId) {
              setSelectedPersonaId(null);
            }
          },
          onError: (error) => {
            showSnackbar(error instanceof Error ? error.message : 'Failed to delete persona', {
              severity: 'error',
            });
          },
        }
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeletePersonaId(null);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingPersona(null);
  };

  return (
    <div className={`${styles.sectionContainer} ${scrollbarStyles.scrollbarContainer}`}>
      {/* Box 1: Header */}
      <PageHeader
        title="Persona"
        buttonLabel="Add Persona"
        onButtonClick={handleAddPersona}
        buttonIcon={<AddIcon fontSize="small" />}
      />

      {/* Box 2: Navigation */}
      <div className={styles.navigation}>
        <span className={styles.navCurrent}>All Personas</span>
      </div>

      {/* Box 3: Search */}
      <SearchBar placeholder="Search personas..." value={searchQuery} onChange={setSearchQuery} />

      {/* Box 4: Persona cards list */}
      {isLoading ? (
        <p className={styles.loadingText}>Loading personas...</p>
      ) : personas.length === 0 ? (
        <p className={styles.emptyText}>No personas found</p>
      ) : (
        <div
          className={`${styles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
          ref={scrollContainerRef}
        >
          {/* Top sentinel for scroll up detection */}
          <div ref={topSentinelRef} className={styles.sentinel} />

          <div className={styles.itemList}>
            {personas.map((persona: Persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                isSelected={selectedPersonaId === persona.id}
                disabled={setActivePersona.isPending}
                onSetActive={handleSetActivePersona}
                onNavigate={onSelectPersona}
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

      {/* Error state with retry button */}
      {isError && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load personas. Please try again.</p>
          <EnhancedButton
            label="Retry"
            colorTheme="secondary"
            size="small"
            onClick={() => refetch()}
            startIcon={<RefreshIcon fontSize="small" />}
          />
        </div>
      )}

      <CreatePersonaModal
        isOpen={isCreateModalOpen || !!editingPersona}
        onClose={handleCloseCreateModal}
        initialData={editingPersona || undefined}
      />
      <ConfirmModal
        isOpen={!!deletePersonaId}
        title="Delete Persona"
        message="Are you sure you want to delete this persona? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deletePersona.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
