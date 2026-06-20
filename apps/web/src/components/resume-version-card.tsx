import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Radio, CircularProgress } from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  ContentCopy,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { EnhancedTooltipWithText } from '@repo/ui';
import { useViewDocument } from '../hooks/use-resume-versions';
import type { ResumeVersionMetadata, ResumeData } from '@repo/shared-types';
import { useStore } from '../store';
import Editor from '@monaco-editor/react';
import styles from './style/resume-version-card.module.css';

interface ResumeVersionCardProps {
  version: ResumeVersionMetadata;
  resumeId: string;
  previousVersion: ResumeVersionMetadata | null;
  isSelected: boolean;
  disabled?: boolean;
  onSetActive: (version: ResumeVersionMetadata) => void;
  onEdit?: (version: ResumeVersionMetadata) => void;
  onDelete?: (version: ResumeVersionMetadata) => void;
  onBranch?: (version: ResumeVersionMetadata) => void;
  onFetchParsedData: (resumeId: string, versionId: string) => Promise<ResumeData | null>;
  hideActions?: boolean;
}

export function ResumeVersionCard({
  version,
  resumeId,
  previousVersion,
  isSelected,
  disabled,
  onSetActive,
  onEdit,
  onDelete,
  onBranch,
  onFetchParsedData,
  hideActions = false,
}: ResumeVersionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const queryClient = useQueryClient();
  const showSnackbar = useStore((state) => state.showSnackbar);

  // View document query - enabled when isViewing is true
  const viewDocumentQuery = useViewDocument({ resumeId, versionId: version.id }, isViewing);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const radioTooltip = hideActions
    ? 'Select'
    : version.active
      ? 'Active'
      : 'Click to set as active';

  // Calculate diff from previous version
  const getDiffParts = () => {
    if (!previousVersion) {
      if (version.versionName === 'v1') {
        return [{ text: 'First version', type: 'neutral' as const }];
      }
      return [];
    }

    const keywordsAdded = version.keywords.filter((k) => !previousVersion.keywords.includes(k));
    const keywordsRemoved = previousVersion.keywords.filter((k) => !version.keywords.includes(k));

    const parts: { text: string; type: 'added' | 'removed' | 'neutral' }[] = [];
    if (keywordsAdded.length > 0) {
      parts.push({ text: `+${keywordsAdded.length} keywords`, type: 'added' });
    }
    if (keywordsRemoved.length > 0) {
      parts.push({ text: `-${keywordsRemoved.length} keywords`, type: 'removed' });
    }
    if (parts.length === 0) {
      return [{ text: 'No keyword changes', type: 'neutral' as const }];
    }
    return parts;
  };

  const handleViewDocument = async () => {
    // Invalidate the query cache to force a fresh API call
    queryClient.invalidateQueries({
      queryKey: ['resume', resumeId, 'versions', version.id, 'document'],
    });
    // Set viewing state to enable the query
    setIsViewing(true);
  };

  // Helper function to convert base64 to Blob
  const base64ToBlob = (base64: string, contentType: string): Blob | null => {
    try {
      // Handle data URI format: "data:application/pdf;base64,JVBERi..."
      // Extract the actual base64 part after the comma
      let actualBase64 = base64;
      if (base64.includes(',')) {
        actualBase64 = base64.split(',')[1];
      }

      // Sanitize base64: remove whitespace, replace URL-safe chars
      const sanitized = actualBase64.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');

      // Decode base64 to binary
      const binary = atob(sanitized);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: contentType });
    } catch (error) {
      console.error('Error decoding base64:', error);
      return null;
    }
  };

  const downloadWithFilename = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Effect to handle the view document response
  useEffect(() => {
    if (viewDocumentQuery.isSuccess && viewDocumentQuery.data) {
      const { data } = viewDocumentQuery;

      const createBlob = (): Blob | null => {
        // Handle text content first (for TXT files)
        if ('text' in data && typeof data.text === 'string') {
          return new Blob([data.text], { type: data.contentType });
        }

        // Handle binary content (PDF, DOC, DOCX)
        if ('file' in data && data.file !== undefined) {
          // Check if it's a number array (Buffer from JSON parsing)
          if (Array.isArray(data.file)) {
            const bytes = new Uint8Array(data.file as number[]);
            return new Blob([bytes], { type: data.contentType });
          }
          // Check if it's a string (base64 encoded)
          if (typeof data.file === 'string') {
            return base64ToBlob(data.file, data.contentType);
          }
        }
        return null;
      };

      const blob = createBlob();
      if (!blob) {
        console.error('Failed to create blob from response:', data);
        showSnackbar('Failed to create file preview', { severity: 'error' });
        setIsViewing(false);
        return;
      }

      // Try to open with blob URL first
      const blobUrl = URL.createObjectURL(blob);
      const newTab = window.open(blobUrl, '_blank');

      // If new tab opened successfully, clean up after a delay
      if (newTab) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); // Clean up after 1 minute
      } else {
        // Fallback: download with filename
        downloadWithFilename(blob, data.fileName);
      }

      setIsViewing(false);
    }
  }, [viewDocumentQuery, showSnackbar]);

  // Show snackbar on error
  useEffect(() => {
    if (viewDocumentQuery.isError) {
      const message =
        viewDocumentQuery.error instanceof Error
          ? viewDocumentQuery.error.message
          : 'Failed to view document';
      showSnackbar(message, { severity: 'error' });
      setIsViewing(false);
    }
  }, [viewDocumentQuery.isError, viewDocumentQuery.error, showSnackbar]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(version);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(version);
  };

  const handleBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBranch) onBranch(version);
  };

  const handleToggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isExpanded && !parsedData && !isLoadingData) {
      // Fetch parsed data when expanding for the first time
      setIsLoadingData(true);
      try {
        const data = await onFetchParsedData(resumeId, version.id);
        setParsedData(data);
        setIsExpanded(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load parsed data';
        showSnackbar(message, { severity: 'error' });
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`${styles.versionCard} ${isSelected ? styles.selected : ''}`}>
      {/* Section 1: Radio button with tooltip */}
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={isSelected}
            onChange={() => onSetActive(version)}
            disabled={disabled}
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-disabled': {
                color: 'var(--grey-500)',
                pointerEvents: 'none',
                opacity: 0.5,
              },
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </EnhancedTooltipWithText>
      </div>

      {/* Section 2: Data (version name, date/comment, diff) */}
      <div className={styles.dataSection}>
        <div className={styles.versionInfo}>
          <div className={styles.versionNameRow}>
            <p className={styles.versionName}>{version.versionName}</p>
          </div>
          <div className={styles.dateAndFileSize}>
            <span>{formatDate(version.updatedAt)}</span>
            <span className={styles.dotSeparator}>·</span>
            <span>{formatFileSize(version.fileSize)}</span>
          </div>
          {version.comment && (
            <div className={styles.commentRow}>
              <span className={styles.comment}>{version.comment}</span>
            </div>
          )}
          <div className={styles.diffInfo}>
            {getDiffParts().map((part, index) => (
              <span key={index}>
                {index > 0 && <span className={styles.dotSeparator}>, </span>}
                <span
                  className={
                    part.type === 'added'
                      ? styles.added
                      : part.type === 'removed'
                        ? styles.removed
                        : styles.neutral
                  }
                >
                  {part.text}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Action buttons */}
      {!hideActions && (
        <div className={styles.actionsSection}>
          <EnhancedTooltipWithText description="View document" showIcon={false} placement="top">
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleViewDocument}
              disabled={isViewing && viewDocumentQuery.isFetching}
            >
              {isViewing && viewDocumentQuery.isFetching ? (
                <div className={styles.loaderContainer}>
                  <CircularProgress size={'1.25rem'} thickness={4} color="inherit" />
                </div>
              ) : (
                <Visibility sx={{ fontSize: '1.25rem' }} />
              )}
            </button>
          </EnhancedTooltipWithText>
          {onEdit && (
            <EnhancedTooltipWithText description="Edit" showIcon={false} placement="top">
              <button type="button" className={styles.actionButton} onClick={handleEdit}>
                <Edit sx={{ fontSize: '1.25rem' }} />
              </button>
            </EnhancedTooltipWithText>
          )}
          <EnhancedTooltipWithText
            description={isExpanded ? 'Hide parsed data' : 'Show parsed data'}
            showIcon={false}
            placement="top"
          >
            <button type="button" className={styles.actionButton} onClick={handleToggleExpand}>
              {isLoadingData ? (
                <div className={styles.loaderContainer}>
                  <CircularProgress size={'1.25rem'} thickness={4} color="inherit" />
                </div>
              ) : isExpanded ? (
                <KeyboardArrowUp sx={{ fontSize: '1.25rem' }} />
              ) : (
                <KeyboardArrowDown sx={{ fontSize: '1.25rem' }} />
              )}
            </button>
          </EnhancedTooltipWithText>
          {onDelete && (
            <EnhancedTooltipWithText description="Delete" showIcon={false} placement="top">
              <button
                type="button"
                className={`${styles.actionButton} ${styles.delete}`}
                onClick={handleDelete}
                disabled={version.active}
              >
                <Delete sx={{ fontSize: '1.25rem' }} />
              </button>
            </EnhancedTooltipWithText>
          )}
          {onBranch && (
            <EnhancedTooltipWithText
              description="Create new resume from this version"
              showIcon={false}
              placement="top"
            >
              <button type="button" className={styles.actionButton} onClick={handleBranch}>
                <ContentCopy sx={{ fontSize: '1.25rem' }} />
              </button>
            </EnhancedTooltipWithText>
          )}
        </div>
      )}

      {/* Expanded parsed data view */}
      {isExpanded && (
        <div className={styles.expandedSection}>
          <div className={styles.parsedDataSection}>
            <span className={styles.label}>Parsed Data:</span>
            {isLoadingData ? (
              <p className={styles.loadingText}>Loading parsed data...</p>
            ) : parsedData ? (
              <div className={styles.jsonViewerContainer}>
                <Editor
                  height="200px"
                  defaultLanguage="json"
                  value={JSON.stringify(parsedData, null, 2)}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    folding: true,
                    foldingHighlight: true,
                    foldingStrategy: 'indentation',
                    showFoldingControls: 'always',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    readOnly: true,
                    renderWhitespace: 'selection',
                    glyphMargin: true,
                  }}
                />
              </div>
            ) : (
              <p className={styles.noDataText}>No parsed data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
