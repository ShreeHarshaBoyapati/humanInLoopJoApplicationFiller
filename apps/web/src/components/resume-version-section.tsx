import { useState, useCallback, useEffect, useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from './page-header';
import { SearchBar } from './search-bar';
import { ResumeVersionCard } from './resume-version-card';
import { EnhancedSelectDropdown, EnhancedButton } from '@repo/ui';
import { CreateVersionModal } from './create-version-modal';
import { BranchVersionModal } from './branch-version-modal';
import { ConfirmModal } from './confirm-modal';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import {
  useResumeVersions,
  useDeleteVersion,
  useSetActiveVersion,
  useCompareVersions,
  useViewParsedData,
} from '../hooks/use-resume-versions';
import type {
  ResumeVersionMetadata,
  CompareVersionsResponse,
  ResumeData,
} from '@repo/shared-types';
import styles from './style/resume-version-section.module.css';
import sectionStyles from '../routes/style/section.module.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Monaco Diff Viewer component with semantic comparison
interface MonacoDiffViewerProps {
  dataA: ResumeData | null;
  dataB: ResumeData | null;
}

function MonacoDiffViewer({ dataA, dataB }: MonacoDiffViewerProps) {
  const jsonA = useMemo(() => JSON.stringify(dataA, null, 2) || '{}', [dataA]);
  const jsonB = useMemo(() => JSON.stringify(dataB, null, 2) || '{}', [dataB]);

  return (
    <div className={styles.monacoDiffContainer}>
      <DiffEditor
        height="300px"
        language="json"
        original={jsonA}
        modified={jsonB}
        theme="vs-dark"
        options={{
          renderSideBySide: true,
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          folding: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          ignoreTrimWhitespace: false,
        }}
      />
    </div>
  );
}

interface ResumeVersionSectionProps {
  resume: { id: string; fileName: string };
  onBack: () => void;
  onBackToPersonas: () => void;
}

type TabType = 'versions' | 'diff';

export function ResumeVersionSection({
  resume,
  onBack,
  onBackToPersonas,
}: ResumeVersionSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('versions');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVersionForEdit, setSelectedVersionForEdit] =
    useState<ResumeVersionMetadata | null>(null);
  const [selectedVersionForBranch, setSelectedVersionForBranch] =
    useState<ResumeVersionMetadata | null>(null);
  const [selectedVersionForDelete, setSelectedVersionForDelete] =
    useState<ResumeVersionMetadata | null>(null);

  // Versions tab state
  const {
    data: versionsData,
    isLoading: isLoadingVersions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useResumeVersions(resume.id, 10, debouncedSearch);

  // Diff tab state
  const [selectedVersionA, setSelectedVersionA] = useState<string>('');
  const [selectedVersionB, setSelectedVersionB] = useState<string>('');
  const [diffResult, setDiffResult] = useState<CompareVersionsResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Mutations+

  const deleteVersion = useDeleteVersion();
  const setActiveVersion = useSetActiveVersion();
  const compareVersions = useCompareVersions();
  const viewParsedData = useViewParsedData();

  // Get all versions from pages
  const versions: ResumeVersionMetadata[] = useMemo(
    () => versionsData?.pages?.flatMap((page) => page.items) ?? [],
    [versionsData]
  );

  // Get active version
  const activeVersion = versions.find((v) => v.active);
  const selectedVersionId = activeVersion?.id ?? null;

  // Handlers
  const handleSetActive = useCallback(
    async (version: ResumeVersionMetadata) => {
      if (version.active) return;
      try {
        await setActiveVersion.mutateAsync({
          resumeId: resume.id,
          versionId: version.id,
        });
      } catch (error) {
        console.error('Failed to set active version:', error);
        const message = error instanceof Error ? error.message : 'Failed to set active version';
        window.alert(message);
      }
    },
    [resume.id, setActiveVersion]
  );

  const handleEdit = useCallback((version: ResumeVersionMetadata) => {
    setSelectedVersionForEdit(version);
    setIsCreateModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((version: ResumeVersionMetadata) => {
    setSelectedVersionForDelete(version);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedVersionForDelete) return;

    try {
      await deleteVersion.mutateAsync({
        resumeId: resume.id,
        versionId: selectedVersionForDelete.id,
      });
      setIsDeleteModalOpen(false);
      setSelectedVersionForDelete(null);
    } catch (error) {
      console.error('Failed to delete version:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete version';
      window.alert(message);
    }
  }, [resume.id, deleteVersion, selectedVersionForDelete]);

  const handleBranchClick = useCallback((version: ResumeVersionMetadata) => {
    setSelectedVersionForBranch(version);
    setIsBranchModalOpen(true);
  }, []);

  const handleFetchParsedData = useCallback(
    async (resumeId: string, versionId: string): Promise<ResumeData | null> => {
      return await viewParsedData.mutateAsync({ resumeId, versionId });
    },
    [viewParsedData]
  );

  const handleCompare = useCallback(async () => {
    if (!selectedVersionA || !selectedVersionB) return;

    setIsComparing(true);
    try {
      const result = await compareVersions.mutateAsync({
        resumeId: resume.id,
        versionA: selectedVersionA,
        versionB: selectedVersionB,
      });
      setDiffResult(result);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setIsComparing(false);
    }
  }, [resume.id, selectedVersionA, selectedVersionB, compareVersions]);

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedVersionForEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSelectedVersionForEdit(null);
  };

  const handleCloseBranchModal = () => {
    setIsBranchModalOpen(false);
    setSelectedVersionForBranch(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedVersionForDelete(null);
  };

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop <= clientHeight + 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Version options for select dropdowns
  const versionOptions = versions.map((v) => ({
    value: v.id,
    label: `${v.versionName}${v.active ? ' (Active)' : ''}`,
  }));

  return (
    <div className={sectionStyles.sectionContainer}>
      {/* Box 1: Header */}
      <PageHeader
        title="Resume Versions"
        buttonLabel="Add Version"
        onButtonClick={handleOpenCreateModal}
        buttonIcon={<AddIcon fontSize="small" />}
      />

      {/* Box 2: Navigation */}
      <div className={sectionStyles.navigation}>
        <span className={sectionStyles.navTextBlue} onClick={onBackToPersonas}>
          All Personas
        </span>
        <span className={sectionStyles.navSeparator}>/</span>
        <span className={sectionStyles.navTextBlue} onClick={onBack}>
          Resumes
        </span>
        <span className={sectionStyles.navSeparator}>/</span>
        <span className={sectionStyles.navCurrent}>Versions</span>
      </div>

      {/* Box 3: Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'versions' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('versions');
            setSelectedVersionA('');
            setSelectedVersionB('');
            setDiffResult(null);
            setIsComparing(false);
          }}
        >
          Versions
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'diff' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('diff');
            setSearchQuery('');
            setDebouncedSearch('');
          }}
        >
          Diff
        </button>
      </div>

      {/* Box 4: Search (only in versions tab) */}
      {activeTab === 'versions' && (
        <SearchBar placeholder="Search versions..." value={searchQuery} onChange={setSearchQuery} />
      )}

      {/* Box 5: Content */}
      {activeTab === 'versions' ? (
        isLoadingVersions ? (
          <p className={sectionStyles.loadingText}>Loading versions...</p>
        ) : versions.length === 0 ? (
          <p className={sectionStyles.emptyText}>No versions found</p>
        ) : (
          <div
            className={`${sectionStyles.scrollContainer} ${scrollbarStyles.scrollbarVerticalContainer}`}
            onScroll={handleScroll}
          >
            <div className={sectionStyles.itemList}>
              {versions.map((version, index) => (
                <ResumeVersionCard
                  key={version.id}
                  version={version}
                  resumeId={resume.id}
                  previousVersion={index < versions.length - 1 ? versions[index + 1] : null}
                  isSelected={version.id === selectedVersionId}
                  disabled={setActiveVersion.isPending}
                  onSetActive={handleSetActive}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onBranch={handleBranchClick}
                  onFetchParsedData={handleFetchParsedData}
                />
              ))}
            </div>
            {isFetchingNextPage && <p className={sectionStyles.loadingText}>Loading...</p>}
          </div>
        )
      ) : (
        <div className={styles.diffContainer}>
          <div className={styles.selectsRow}>
            <div className={styles.selectWrapper}>
              <EnhancedSelectDropdown
                id="version-a-select"
                testId="version-a-select"
                label="Version A"
                value={selectedVersionA}
                onChange={(e) => setSelectedVersionA(e.target.value as string)}
                options={versionOptions}
              />
            </div>
            <div className={styles.selectWrapper}>
              <EnhancedSelectDropdown
                id="version-b-select"
                testId="version-b-select"
                label="Version B"
                value={selectedVersionB}
                onChange={(e) => setSelectedVersionB(e.target.value as string)}
                options={versionOptions}
              />
            </div>
            <EnhancedButton
              testId="compare-button"
              label={isComparing ? 'Comparing...' : 'Compare'}
              colorTheme="secondary"
              onClick={handleCompare}
              disabled={!selectedVersionA || !selectedVersionB || isComparing}
            />
          </div>

          {diffResult && (
            <div className={`${styles.diffResult} ${scrollbarStyles.scrollbarVerticalContainer}`}>
              <div className={styles.diffHeader}>
                <h3 className={styles.diffTitle}>Comparison Results</h3>
              </div>

              <div className={styles.diffDetailsContainer}>
                <div className={styles.diffVersionColumn}>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>File:</span>
                    <span>{diffResult.versionA.fileName}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Size:</span>
                    <span>{formatBytes(diffResult.versionA.fileSize)}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Comment:</span>
                    <span>{diffResult.versionA.comment ?? 'No comment'}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Updated:</span>
                    <span>{formatDate(diffResult.versionA.updatedAt)}</span>
                  </div>
                </div>
                <div className={styles.diffVersionColumn}>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>File:</span>
                    <span>{diffResult.versionB.fileName}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Size:</span>
                    <span>{formatBytes(diffResult.versionB.fileSize)}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Comment:</span>
                    <span>{diffResult.versionB.comment ?? 'No comment'}</span>
                  </div>
                  <div className={styles.diffVersionInfo}>
                    <span className={styles.diffMetaLabel}>Updated:</span>
                    <span>{formatDate(diffResult.versionB.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Parsed Data Comparison - Monaco Diff Viewer */}
              <div className={styles.parsedDataSection}>
                <h4 className={styles.parsedDataHeader}>Parsed Data Comparison</h4>
                <MonacoDiffViewer
                  dataA={diffResult.versionA.parsedData}
                  dataB={diffResult.versionB.parsedData}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Version Modal */}
      <CreateVersionModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        resumeId={resume.id}
        editVersion={
          selectedVersionForEdit
            ? {
                id: selectedVersionForEdit.id,
                versionName: selectedVersionForEdit.versionName,
                fileSize: selectedVersionForEdit.fileSize,
                keywords: selectedVersionForEdit.keywords,
                comment: selectedVersionForEdit.comment,
              }
            : undefined
        }
      />

      {/* Branch Version Modal */}
      {selectedVersionForBranch && (
        <BranchVersionModal
          isOpen={isBranchModalOpen}
          onClose={handleCloseBranchModal}
          resumeId={resume.id}
          versionId={selectedVersionForBranch.id}
          defaultFileName={`${resume.fileName} (copy)`}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Version"
        message={`Are you sure you want to delete version "${selectedVersionForDelete?.versionName || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseDeleteModal}
        isLoading={deleteVersion.isPending}
      />
    </div>
  );
}
