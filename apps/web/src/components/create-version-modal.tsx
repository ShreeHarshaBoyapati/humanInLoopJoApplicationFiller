import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Modal, FileUploader, EnhancedTextField, EnhancedButton } from '@repo/ui';
import type { FileDisplayFile } from '@repo/ui';
import {
  useCreateVersion,
  useUpdateVersion,
  useParseVersionFile,
  useViewParsedData,
} from '../hooks/use-resume-versions';
import type { FileDataPayload, ResumeData } from '@repo/shared-types';
import Editor from '@monaco-editor/react';
import { CircularProgress } from '@mui/material';
import styles from './style/create-resume-modal.module.css';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  personaId: string;
  editVersion?: {
    id: string;
    versionName: string;
    fileSize: number;
    keywords: string[];
    comment: string | null;
  } | null;
}

const convertFileToBase64 = (file: File): Promise<FileDataPayload> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64Data,
      });
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

export function CreateVersionModal({
  isOpen,
  onClose,
  resumeId,
  personaId,
  editVersion,
}: CreateVersionModalProps) {
  const [commit, setCommit] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<(File | FileDisplayFile)[]>([]);
  const [commitError, setCommitError] = useState('');
  const [fileError, setFileError] = useState('');
  const [apiError, setApiError] = useState('');
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setErrorRef = (node: HTMLParagraphElement | null) => {
    if (node) {
      errorRef.current = node;
    }
  };

  const isEditMode = !!editVersion;

  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const parseFile = useParseVersionFile();
  const viewParsedData = useViewParsedData();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset all state when modal opens
      if (isEditMode && editVersion) {
        setCommit(editVersion.comment || '');
        // Initialize with existing file as FileDisplayFile
        setSelectedFiles([{ name: editVersion.versionName, size: editVersion.fileSize }]);
      } else {
        setCommit('');
        setSelectedFiles([]);
      }
      setCommitError('');
      setFileError('');
      setApiError('');
      setParsedData(null);
      setIsParsing(false);
    }
  }, [isOpen, isEditMode, editVersion]);

  // Scroll to error when apiError occurs
  useEffect(() => {
    if (apiError && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [apiError]);

  const handleFilesSelected = (files: (File | FileDisplayFile)[]) => {
    setSelectedFiles(files);
    setFileError('');
    if (apiError) setApiError('');
  };

  const handleFileError = (error: string) => {
    setFileError(error);
    // Restore existing file if in edit mode
    setSelectedFiles(
      isEditMode && editVersion
        ? [{ name: editVersion.versionName, size: editVersion.fileSize }]
        : []
    );
  };

  const handleCommitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCommit(e.target.value);
    if (commitError) setCommitError('');
    if (apiError) setApiError('');
  };

  // Check if selectedFiles contains any File objects (new uploads)
  const hasOnlyNewFiles = selectedFiles.some((f) => f instanceof File);

  const handleParseOrNext = async () => {
    // Edit mode with existing file and no new file: load existing parsed data
    if (isEditMode && editVersion && !hasOnlyNewFiles) {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsParsing(true);
        const result = await viewParsedData.mutateAsync({
          resumeId,
          versionId: editVersion.id,
        });
        setParsedData(result);
        setIsParsing(false);
        setApiError('');
        abortControllerRef.current = null;
      } catch (error) {
        // Check if this was an abort error
        if (error instanceof Error && error.name === 'CanceledError') {
          setIsParsing(false);
          abortControllerRef.current = null;
          return;
        }
        setApiError(error instanceof Error ? error.message : 'Failed to load parsed data');
        setIsParsing(false);
        abortControllerRef.current = null;
      }
      return;
    }

    // Get the first new File object
    const newFile = selectedFiles.find((f) => f instanceof File) as File | undefined;

    // Must have a new file selected
    if (!newFile) {
      setFileError('Please select a file first');
      return;
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsParsing(true);
      const result = await parseFile.mutateAsync({
        file: newFile,
        signal: abortControllerRef.current.signal,
      });
      setParsedData(result);
      setIsParsing(false);
      setApiError('');
      abortControllerRef.current = null;
    } catch (error) {
      // Check if this was an abort error
      if (error instanceof Error && error.name === 'CanceledError') {
        setIsParsing(false);
        abortControllerRef.current = null;
        return;
      }
      setApiError(error instanceof Error ? error.message : 'Failed to parse file');
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };

  const handleSave = async () => {
    try {
      if (isEditMode && editVersion) {
        // Edit mode: always use updateVersion
        const newFile = selectedFiles.find((f) => f instanceof File) as File | undefined;

        if (newFile) {
          // New file uploaded, include it in update
          const fileData = await convertFileToBase64(newFile);
          await updateVersion.mutateAsync({
            resumeId,
            versionId: editVersion.id,
            personaId,
            file: fileData,
            keywords: parsedData?.keywords,
            parsedData: parsedData || undefined,
            comment: commit.trim() || undefined,
          });
        } else {
          // No new file, just update metadata
          await updateVersion.mutateAsync({
            resumeId,
            versionId: editVersion.id,
            personaId,
            keywords: parsedData?.keywords,
            parsedData: parsedData || undefined,
            comment: commit.trim() || undefined,
          });
        }
      } else {
        // Create mode: must have selected a file
        const newFile = selectedFiles.find((f) => f instanceof File) as File | undefined;
        if (!newFile) {
          setFileError('Please select a file');
          return;
        }

        const fileData = await convertFileToBase64(newFile);
        await createVersion.mutateAsync({
          resumeId,
          personaId,
          file: fileData,
          keywords: parsedData?.keywords || [],
          parsedData: parsedData || undefined,
          comment: commit.trim() || undefined,
        });
      }

      // Reset state on success
      setCommit('');
      setSelectedFiles([]);
      setApiError('');
      setParsedData(null);
      setIsParsing(false);
      onClose();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to save version');
    }
  };

  const handleCancel = () => {
    // Abort any ongoing parse request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCommit('');
    setSelectedFiles([]);
    setCommitError('');
    setFileError('');
    setApiError('');
    setParsedData(null);
    setIsParsing(false);
    onClose();
  };

  const handleBackToUpload = () => {
    setParsedData(null);
    setIsParsing(false);
    setApiError('');
  };

  const isPending = isEditMode ? updateVersion.isPending : createVersion.isPending;
  const isLoading = parseFile.isPending || viewParsedData.isPending;

  const renderContent = () => {
    // State 1: File uploader + commit field
    if (!isParsing && !parsedData) {
      return (
        <div className={styles.formDiv}>
          {isEditMode && (
            <EnhancedTextField
              label="Commit Message"
              placeholder="Enter commit message (optional)"
              value={commit}
              onChange={handleCommitChange}
              variant={commitError ? 'error' : 'default'}
              helperText={commitError}
            />
          )}
          <FileUploader
            value={selectedFiles}
            onFilesSelected={handleFilesSelected}
            onError={handleFileError}
            acceptedFormats={['.pdf', '.doc', '.docx']}
            maxFiles={1}
            maxSizeMB={10}
            testId="version-file-uploader"
          />

          {fileError && <p className={styles.apiError}>{fileError}</p>}
          {apiError && (
            <p ref={setErrorRef} className={styles.apiError}>
              {apiError}
            </p>
          )}
        </div>
      );
    }

    // State 2: Loading - Circular loader
    if (isParsing) {
      return (
        <div className={`${styles.circularLoaderContainer}`}>
          <CircularProgress color="primary" size={'3rem'} />
          <p className={styles.loaderText}>
            {!hasOnlyNewFiles ? 'Loading parsed data...' : 'Extracting resume data...'}
          </p>
        </div>
      );
    }

    // State 3: Review - Commit + JSON Viewer
    return (
      <div className={styles.formDiv}>
        {!isEditMode && (
          <EnhancedTextField
            label="Commit Message"
            placeholder="Enter commit message (optional)"
            value={commit}
            onChange={handleCommitChange}
            variant={commitError ? 'error' : 'default'}
            helperText={commitError}
          />
        )}
        <JsonViewer data={parsedData!} onEdit={setParsedData} />
        {apiError && (
          <p ref={setErrorRef} className={styles.apiError}>
            {apiError}
          </p>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    // State 1: Cancel + Next/Parse
    if (!parsedData && !isParsing) {
      return (
        <div className={styles.footerContainer}>
          <EnhancedButton label="Cancel" colorTheme="secondary" onClick={handleCancel} />
          <EnhancedButton
            label={isEditMode ? 'Next' : 'Parse'}
            colorTheme="primary"
            onClick={handleParseOrNext}
            disabled={
              isLoading ||
              (!isEditMode && !selectedFiles.some((f) => f instanceof File)) ||
              (isEditMode && selectedFiles.length === 0)
            }
          />
        </div>
      );
    }

    // State 2: Loading
    if (isParsing) {
      return (
        <div className={styles.footerContainer}>
          <EnhancedButton label="Cancel" colorTheme="secondary" onClick={handleCancel} />
        </div>
      );
    }

    // State 3: Back + Cancel + Save
    return (
      <div className={styles.footerContainerWithBack}>
        <div className={styles.footerLeft}>
          <EnhancedButton
            label="Back"
            colorTheme="secondary"
            onClick={handleBackToUpload}
            disabled={isPending}
          />
        </div>
        <div className={styles.footerRight}>
          <EnhancedButton label="Cancel" colorTheme="secondary" onClick={handleCancel} />
          <EnhancedButton
            label={isEditMode ? 'Save' : 'Create'}
            colorTheme="primary"
            onClick={handleSave}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress color="inherit" size={'1rem'} /> : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      headerTitle={isEditMode ? 'Edit Version' : 'Add Version'}
      footer={renderFooter()}
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '600px', minWidth: '500px' } },
          body: { className: `${styles.form} ${styles.scrollbarVerticalContainer}` },
        },
      }}
    >
      {renderContent()}
    </Modal>
  );
}

// JsonViewer component using Monaco Editor
interface JsonViewerProps {
  data: ResumeData;
  onEdit: (data: ResumeData) => void;
}

function JsonViewer({ data, onEdit }: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as ResumeData;
        onEdit(parsed);
      } catch {
        // Invalid JSON - don't update
      }
    }
  };

  return (
    <div className={`${styles.jsonViewerContainer} ${styles.scrollbarVerticalContainer}`}>
      <Editor
        height="300px"
        defaultLanguage="json"
        value={jsonString}
        onChange={handleEditorChange}
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
          readOnly: false,
          renderWhitespace: 'selection',
          glyphMargin: true,
        }}
      />
    </div>
  );
}
