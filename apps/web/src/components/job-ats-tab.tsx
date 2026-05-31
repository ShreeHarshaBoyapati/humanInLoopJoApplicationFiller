import { useState, useRef, useEffect, useMemo, useReducer, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import styles from './style/job-ats-tab.module.css';
import sectionStyles from '../routes/style/section.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import { EnhancedButton } from '@repo/ui';
import { SearchBar } from './search-bar';
import { ResultCard } from './result-card';
import { ResultDetailView } from './result-detail-view';
import { ResumeVersionView } from './resume-version-view';
import { PersonaSelectSection } from './persona-select-section';
import { ResumeSelectSection } from './resume-select-section';
import { VersionSelectSection } from './version-select-section';
import { useResults, useResultDetail } from '../hooks/use-results';
import { useAnalyzeKeywords } from '../hooks/use-analyze-keywords';
import type {
  PaginatedResultListItem,
  Persona,
  ResumeVersionMetadata,
  PaginatedResumeListItem,
  AnalysisResult,
} from '@repo/shared-types';
import { PageHeader } from './page-header';
import { useStore } from '../store';
import { AnalysisSkeleton } from './analysis-skeleton';

type FlowState =
  | 'list'
  | 'select-persona'
  | 'select-resume'
  | 'select-version'
  | 'analyzing'
  | 'result';

interface FlowStateData {
  flowState: FlowState;
  selectedPersona: Persona | null;
  selectedResume: PaginatedResumeListItem | null;
  selectedVersion: ResumeVersionMetadata | null;
  analysisResult: AnalysisResult | null;
}

type FlowAction =
  | { type: 'START_ADD_FLOW' }
  | { type: 'SELECT_PERSONA'; persona: Persona }
  | { type: 'SELECT_RESUME'; resume: PaginatedResumeListItem }
  | { type: 'SELECT_VERSION'; version: ResumeVersionMetadata }
  | { type: 'START_ANALYZING' }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult }
  | { type: 'GO_BACK' }
  | { type: 'DONE' }
  | { type: 'GO_TO_PERSONA' }
  | { type: 'GO_TO_RESUME' }
  | { type: 'GO_TO_VERSION' };

const initialFlowState: FlowStateData = {
  flowState: 'list',
  selectedPersona: null,
  selectedResume: null,
  selectedVersion: null,
  analysisResult: null,
};

function flowReducer(state: FlowStateData, action: FlowAction): FlowStateData {
  switch (action.type) {
    case 'START_ADD_FLOW':
      return { ...initialFlowState, flowState: 'select-persona' };
    case 'SELECT_PERSONA':
      return {
        ...state,
        flowState: 'select-resume',
        selectedPersona: action.persona,
        selectedResume: null,
        selectedVersion: null,
      };
    case 'SELECT_RESUME':
      return {
        ...state,
        flowState: 'select-version',
        selectedResume: action.resume,
        selectedVersion: null,
      };
    case 'SELECT_VERSION':
      return { ...state, selectedVersion: action.version };
    case 'START_ANALYZING':
      return { ...state, flowState: 'analyzing' };
    case 'ANALYSIS_COMPLETE':
      return { ...state, flowState: 'result', analysisResult: action.result };
    case 'GO_BACK':
      switch (state.flowState) {
        case 'select-persona':
          return initialFlowState;
        case 'select-resume':
          return { ...state, flowState: 'select-persona', selectedResume: null };
        case 'select-version':
          return { ...state, flowState: 'select-resume', selectedVersion: null };
        case 'analyzing':
          return { ...state, flowState: 'select-version' };
        case 'result':
          return { ...state, flowState: 'select-version' };
        default:
          return state;
      }
    case 'DONE':
      return initialFlowState;
    case 'GO_TO_PERSONA':
      return {
        ...state,
        flowState: 'select-persona',
        selectedResume: null,
        selectedVersion: null,
        analysisResult: null,
      };
    case 'GO_TO_RESUME':
      return {
        ...state,
        flowState: 'select-resume',
        selectedVersion: null,
        analysisResult: null,
      };
    case 'GO_TO_VERSION':
      return {
        ...state,
        flowState: 'select-version',
        analysisResult: null,
      };
    default:
      return state;
  }
}

interface JobAtsTabProps {
  jobId: string;
}

export function JobAtsTab({ jobId }: JobAtsTabProps) {
  // Add result flow state with useReducer
  const [flowData, dispatch] = useReducer(flowReducer, initialFlowState);
  const showSnackbar = useStore((state) => state.showSnackbar);

  // Existing state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [viewingResultDetail, setViewingResultDetail] = useState(false);
  const [viewingResumeDetail, setViewingResumeDetail] = useState(false);
  const [selectedResumeData, setSelectedResumeData] = useState<{
    resumeId: string;
    versionId: string;
    versionName: string;
    resumeName: string;
  } | null>(null);

  // Analyze keywords mutation
  const analyzeKeywordsMutation = useAnalyzeKeywords();
  const isAnalyzing = analyzeKeywordsMutation.isPending;

  // Abort controller for canceling the analysis
  const abortControllerRef = useRef<AbortController | null>(null);

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
    setSelectedResumeData({
      resumeId: result.resumeId,
      versionId: result.resumeVersionId,
      versionName: result.versionName,
      resumeName: result.resumeName,
    });
    setViewingResumeDetail(true);
  };

  const handleViewResult = (result: PaginatedResultListItem) => {
    setSelectedResultId(result.id);
    setViewingResultDetail(true);
  };

  const handleBackToList = () => {
    setViewingResultDetail(false);
  };

  const handleBackFromResume = () => {
    setViewingResumeDetail(false);
    setSelectedResumeData(null);
  };

  const handleAddResult = () => {
    dispatch({ type: 'START_ADD_FLOW' });
  };

  const handleAnalyze = async () => {
    if (!flowData.selectedVersion) return;

    // Navigate to analyzing state immediately
    dispatch({ type: 'START_ANALYZING' });

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await analyzeKeywordsMutation.mutateAsync({
        jobId,
        resumeVersionId: flowData.selectedVersion.id,
        signal: abortController.signal,
      });

      // Clear abort controller ref
      abortControllerRef.current = null;

      // Show success message if provided
      if (response.message) {
        showSnackbar(response.message, { severity: 'success' });
      }

      // Navigate to result with the data
      dispatch({ type: 'ANALYSIS_COMPLETE', result: response.data });
    } catch (error) {
      // Clear abort controller ref
      abortControllerRef.current = null;

      // Check if it was cancelled
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'CanceledError')
      ) {
        // User cancelled - already navigated back via GO_BACK
        return;
      }

      const message = error instanceof Error ? error.message : 'Failed to analyze keywords';
      showSnackbar(message, { severity: 'error' });
      dispatch({ type: 'GO_BACK' });
    }
  };

  // Cancel analysis and navigate
  const cancelAnalysisAndNavigate = (action: FlowAction) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(action);
  };

  // Show persona selection flow
  if (flowData.flowState === 'select-persona') {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Persona</span>
        </div>
        <PersonaSelectSection
          onSelect={(persona) => dispatch({ type: 'SELECT_PERSONA', persona })}
          selectedPersonaId={flowData.selectedPersona?.id || null}
        />
      </div>
    );
  }

  // Show resume selection flow
  if (flowData.flowState === 'select-resume' && flowData.selectedPersona) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'DONE' })}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Persona
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Resume</span>
        </div>
        <ResumeSelectSection
          personaId={flowData.selectedPersona.id}
          onSelect={(resume) => dispatch({ type: 'SELECT_RESUME', resume })}
          selectedResumeId={flowData.selectedResume?.id || null}
        />
      </div>
    );
  }

  // Show version selection flow
  if (
    flowData.flowState === 'select-version' &&
    flowData.selectedPersona &&
    flowData.selectedResume
  ) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        <PageHeader
          title="ATS History"
          buttonLabel="Analyze"
          onButtonClick={handleAnalyze}
          buttonIcon={<AddIcon fontSize="small" />}
          headerProps={{ className: styles.header }}
          isButtonDisabled={!flowData.selectedVersion || isAnalyzing}
        />
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'DONE' })}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Persona
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Resume
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Versions</span>
        </div>
        <VersionSelectSection
          resumeId={flowData.selectedResume.id}
          personaId={flowData.selectedPersona?.id || ''}
          onSelect={(version) => dispatch({ type: 'SELECT_VERSION', version })}
          selectedVersionId={flowData.selectedVersion?.id || null}
        />
      </div>
    );
  }

  // Show analyzing flow - show skeleton while analyzing
  if (flowData.flowState === 'analyzing') {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />
        <div className={styles.navigation}>
          <span
            className={sectionStyles.navTextBlue}
            onClick={() => cancelAnalysisAndNavigate({ type: 'DONE' })}
          >
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span
            className={sectionStyles.navTextBlue}
            onClick={() => cancelAnalysisAndNavigate({ type: 'GO_TO_PERSONA' })}
          >
            Persona
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span
            className={sectionStyles.navTextBlue}
            onClick={() => cancelAnalysisAndNavigate({ type: 'GO_TO_RESUME' })}
          >
            Resume
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span
            className={sectionStyles.navTextBlue}
            onClick={() => cancelAnalysisAndNavigate({ type: 'GO_TO_VERSION' })}
          >
            Versions
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Result</span>
        </div>
        <AnalysisSkeleton />
      </div>
    );
  }

  // Show result flow
  if (flowData.flowState === 'result' && flowData.analysisResult) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'DONE' })}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Persona
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Resume
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navTextBlue} onClick={() => dispatch({ type: 'GO_BACK' })}>
            Versions
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Result</span>
        </div>
        <ResultDetailView
          result={{
            id: '',
            versionName: flowData.selectedVersion?.versionName || '',
            resumeName: flowData.selectedResume?.fileName || '',
            personaName: flowData.selectedPersona?.title || '',
            score: flowData.analysisResult.score,
            breakdown: flowData.analysisResult,
            resumeVersionId: flowData.selectedVersion?.id || '',
            jobId: jobId,
            createdAt: new Date(),
          }}
          isLoading={false}
          error={undefined}
        />
      </div>
    );
  }

  // Show resume version view when viewing a resume
  if (viewingResumeDetail && selectedResumeData) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        {/* Header without button */}
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />

        {/* Navigation */}
        <div className={styles.navigation}>
          <span className={sectionStyles.navTextBlue} onClick={handleBackFromResume}>
            ATS History
          </span>
          <span className={sectionStyles.navSeparator}>/</span>
          <span className={sectionStyles.navCurrent}>Resume Version</span>
        </div>

        <ResumeVersionView
          resumeId={selectedResumeData.resumeId}
          versionId={selectedResumeData.versionId}
          versionName={selectedResumeData.versionName}
          resumeName={selectedResumeData.resumeName}
        />
      </div>
    );
  }

  // Show detail view when viewing a result
  if (viewingResultDetail && selectedResultId) {
    return (
      <div className={`${styles.tabContainer} ${scrollbarStyles.scrollbarContainer}`}>
        {/* Header without button */}
        <PageHeader title="ATS History" headerProps={{ className: styles.header }} />

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
        title="ATS History"
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
