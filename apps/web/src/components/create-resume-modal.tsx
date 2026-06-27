import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Modal, FileUploader, EnhancedTextField, EnhancedButton } from '@repo/ui';
import type { FileDisplayFile } from '@repo/ui';
import { useCreateResume, useParseResumeFile } from '../hooks/use-resumes';
import type { FileDataPayload, ResumeData } from '@repo/shared-types';
import Editor from '@monaco-editor/react';
import { CircularProgress } from '@mui/material';
import styles from './style/create-resume-modal.module.css';

interface CreateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: string;
}

const convertFileToBase64 = (file: File): Promise<FileDataPayload> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
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

export function CreateResumeModal({ isOpen, onClose, personaId }: CreateResumeModalProps) {
  const [resumeName, setResumeName] = useState('');
  const [commit, setCommit] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [nameError, setNameError] = useState('');
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

  const createResume = useCreateResume();
  const parseResume = useParseResumeFile();

  useEffect(() => {
    if (isOpen) {
      setResumeName('');
      setCommit('');
      setSelectedFiles([]);
      setNameError('');
      setFileError('');
      setApiError('');
      setParsedData(null);
      setIsParsing(false);
    }
  }, [isOpen]);

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
    // Filter to only actual File objects (not FileDisplayFile)
    const actualFiles = files.filter((f): f is File => f instanceof File);
    setSelectedFiles(actualFiles);
    setFileError('');
    if (apiError) setApiError('');

    // Pre-fill resume name with file name (without extension) when file is selected
    if (actualFiles.length > 0) {
      const fileName = actualFiles[0].name;
      setResumeName(fileName);
    }
  };

  const handleFileError = (error: string) => {
    setFileError(error);
    setSelectedFiles([]);
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResumeName(e.target.value);
    if (nameError) setNameError('');
    if (apiError) setApiError('');
  };

  const handleCommitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCommit(e.target.value);
    if (apiError) setApiError('');
  };

  const handleParse = async () => {
    if (selectedFiles.length === 0) {
      setFileError('Please select a file first');
      return;
    }

    const file = selectedFiles[0];

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsParsing(true);
      const result = await parseResume.mutateAsync({
        file,
        signal: abortControllerRef.current.signal,
      });
      setParsedData(result);
      setIsParsing(false);
      setApiError('');
      abortControllerRef.current = null;
    } catch (error) {
      // Check if this was an abort error
      if (error instanceof Error && error.name === 'CanceledError') {
        // User cancelled, don't show error
        setIsParsing(false);
        abortControllerRef.current = null;
        return;
      }
      setApiError(error instanceof Error ? error.message : 'Failed to parse resume');
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!resumeName.trim()) {
      setNameError('Resume name is required');
      return;
    }

    if (selectedFiles.length === 0) {
      setFileError('Please select a file');
      return;
    }

    const file = selectedFiles[0];

    try {
      const fileData = await convertFileToBase64(file);

      createResume.mutate(
        {
          personaId,
          file: fileData,
          fileName: resumeName.trim(),
          keywords: parsedData?.keywords || [],
          parsedData: parsedData || undefined,
          comment: commit.trim() || undefined,
        },
        {
          onSuccess: () => {
            setResumeName('');
            setCommit('');
            setSelectedFiles([]);
            setApiError('');
            setParsedData(null);
            setIsParsing(false);
            onClose();
          },
          onError: (error) => {
            setApiError(error instanceof Error ? error.message : 'Failed to create resume');
          },
        }
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to process file');
    }
  };

  const handleCancel = () => {
    // Abort any ongoing parse request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setResumeName('');
    setCommit('');
    setSelectedFiles([]);
    setNameError('');
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

  const isPending = createResume.isPending;
  const isLoading = parseResume.isPending;

  // State 1: Initial (Upload) - only file uploader
  // State 2: Loading - circular loader
  // State 3: Review - Resume Name + JSON Viewer

  const renderContent = () => {
    // State 1: Initial - File uploader only
    if (!isParsing && !parsedData) {
      return (
        <div className={styles.formDiv}>
          <FileUploader
            value={selectedFiles}
            onFilesSelected={handleFilesSelected}
            onError={handleFileError}
            acceptedFormats={['.pdf', '.doc', '.docx']}
            maxFiles={1}
            maxSizeMB={10}
            testId="resume-file-uploader"
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

    // State 2: Loading - Circular loader only
    if (isParsing) {
      return (
        <div className={`${styles.circularLoaderContainer}`}>
          <CircularProgress color="primary" size={'3rem'} />
          <p className={styles.loaderText}>Extracting resume data...</p>
        </div>
      );
    }

    // State 3: Review - Resume Name + Commit + JSON Viewer
    return (
      <div className={styles.formDiv}>
        <EnhancedTextField
          label="Resume Name"
          placeholder="Enter resume name"
          value={resumeName}
          onChange={handleNameChange}
          variant={nameError ? 'error' : 'default'}
          helperText={nameError}
        />
        <EnhancedTextField
          label="Commit Message"
          placeholder="Enter commit message (optional)"
          value={commit}
          onChange={handleCommitChange}
        />
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
    // States 1 & 2: Right-aligned Cancel + Parse
    if (!parsedData) {
      return (
        <div className={styles.footerContainer}>
          <EnhancedButton label="Cancel" colorTheme="secondary" onClick={handleCancel} />
          <EnhancedButton
            label="Parse"
            colorTheme="primary"
            onClick={handleParse}
            disabled={isLoading || selectedFiles.length === 0}
          />
        </div>
      );
    }

    // State 3: Back on left + Cancel + Create on right
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
            label="Create"
            colorTheme="primary"
            onClick={handleSave}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={'1rem'} color="inherit" /> : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      headerTitle="Create Resume"
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
    <div className={`${styles.jsonViewerContainer}`}>
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
