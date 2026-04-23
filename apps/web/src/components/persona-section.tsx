import { useState, useRef, useEffect, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import styles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import '@repo/ui/constants/css-constants.css';
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

  const handleSetActivePersona = (persona: Persona) => {
    setSelectedPersonaId(persona.id);
    if (!persona.active) {
      setActivePersona.mutate(persona.id);
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
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
