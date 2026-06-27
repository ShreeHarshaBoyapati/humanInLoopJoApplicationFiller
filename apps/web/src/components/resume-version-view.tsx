import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Visibility } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { EnhancedButton } from '@repo/ui';
import { useViewParsedData, useViewDocument } from '../hooks/use-resume-versions';
import styles from './style/resume-version-view.module.css';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';
import Editor from '@monaco-editor/react';
import { useStore } from '../store';

interface ResumeVersionViewProps {
  resumeId: string;
  versionId: string;
  versionName: string;
  resumeName: string;
}

export const ResumeVersionView = ({
  resumeId,
  versionId,
  versionName,
  resumeName,
}: ResumeVersionViewProps) => {
  const [isViewing, setIsViewing] = useState(false);
  const queryClient = useQueryClient();
  const showSnackbar = useStore((state) => state.showSnackbar);

  // Use hooks from use-resume-versions.ts
  const viewParsedDataMutation = useViewParsedData();
  const viewDocumentQuery = useViewDocument({ resumeId, versionId }, isViewing);

  // Fetch parsed data on mount
  useEffect(() => {
    viewParsedDataMutation.mutate({ resumeId, versionId });
  }, [resumeId, versionId, viewParsedDataMutation]);

  // Helper function to convert base64 to Blob
  const base64ToBlob = (base64: string, contentType: string): Blob | null => {
    try {
      let actualBase64 = base64;
      if (base64.includes(',')) {
        actualBase64 = base64.split(',')[1];
      }

      const sanitized = actualBase64.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');

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

  // Handle view document response
  useEffect(() => {
    if (viewDocumentQuery.isSuccess && viewDocumentQuery.data) {
      const data = viewDocumentQuery.data;

      const createBlob = (): Blob | null => {
        if ('text' in data && typeof data.text === 'string') {
          return new Blob([data.text], { type: data.contentType });
        }

        if ('file' in data && data.file !== undefined) {
          if (Array.isArray(data.file)) {
            const bytes = new Uint8Array(data.file as number[]);
            return new Blob([bytes], { type: data.contentType });
          }
          if (typeof data.file === 'string') {
            return base64ToBlob(data.file, data.contentType);
          }
        }
        return null;
      };

      const blob = createBlob();
      if (!blob) {
        showSnackbar('Failed to create file preview', { severity: 'error' });
        setIsViewing(false);
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      const newTab = window.open(blobUrl, '_blank');

      if (newTab) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        downloadWithFilename(blob, data.fileName);
      }

      setIsViewing(false);
    }
  }, [viewDocumentQuery.isSuccess, viewDocumentQuery.data, showSnackbar]);

  // Handle view document error
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

  const handleViewDocument = () => {
    // Invalidate cache to force fresh API call
    queryClient.invalidateQueries({
      queryKey: ['resume', resumeId, 'versions', versionId, 'document'],
    });
    setIsViewing(true);
  };

  const isLoadingData = viewParsedDataMutation.isPending;
  const viewError = viewParsedDataMutation.error?.message || null;
  const parsedData = viewParsedDataMutation.data || null;

  return (
    <div className={`${styles.wrapper} ${scrollbarStyles.scrollbarVerticalContainer}`}>
      <div className={styles.buttonContainer}>
        <span className={styles.sectionLabel}>
          {versionName} - {resumeName}
        </span>
        <EnhancedButton
          label="View Resume"
          colorTheme="secondary"
          onClick={handleViewDocument}
          startIcon={
            isViewing && viewDocumentQuery.isFetching ? (
              <CircularProgress size={'1rem'} thickness={4} color="inherit" />
            ) : (
              <Visibility sx={{ fontSize: '1.25rem' }} />
            )
          }
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
      </div>

      {/* Content */}
      {isLoadingData ? (
        <div className={styles.loaderContainer}>
          <CircularProgress size={'2rem'} thickness={4} />
        </div>
      ) : viewError ? (
        <p className={styles.errorText}>{viewError}</p>
      ) : parsedData ? (
        <div className={styles.jsonViewerContainer}>
          <Editor
            height="300px"
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
  );
};
