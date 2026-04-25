import { useState, useEffect, type ChangeEvent } from 'react';
import { Modal, FileUploader, EnhancedTextField, EnhancedButton } from '@repo/ui';
import { useCreateResume, useParseResumeFile } from '../hooks/use-resumes';
import type { FileDataPayload, ResumeData } from '@repo/shared-types';
import JsonView, { type InteractionProps } from 'react-json-view';
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [nameError, setNameError] = useState('');
  const [fileError, setFileError] = useState('');
  const [apiError, setApiError] = useState('');
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const createResume = useCreateResume();
  const parseResume = useParseResumeFile();

  useEffect(() => {
    if (isOpen) {
      setResumeName('');
      setSelectedFiles([]);
      setNameError('');
      setFileError('');
      setApiError('');
      setParsedData(null);
      setIsParsing(false);
    }
  }, [isOpen]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setFileError('');
    if (apiError) setApiError('');

    // Pre-fill resume name with file name (without extension) when file is selected
    if (files.length > 0) {
      const fileName = files[0].name;
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

  const handleParse = async () => {
    if (selectedFiles.length === 0) {
      setFileError('Please select a file first');
      return;
    }

    const file = selectedFiles[0];

    try {
      setIsParsing(true);
      const result = await parseResume.mutateAsync(file);
      setParsedData(result);
      setIsParsing(false);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to parse resume');
      setIsParsing(false);
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
        },
        {
          onSuccess: () => {
            setResumeName('');
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
    setResumeName('');
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
        <div className={`${styles.form} ${styles.scrollbarVerticalContainer}`}>
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
          {apiError && <p className={styles.apiError}>{apiError}</p>}
        </div>
      );
    }

    // State 2: Loading - Circular loader only
    if (isParsing) {
      return (
        <div className={`${styles.circularLoaderContainer} ${styles.scrollbarVerticalContainer}`}>
          <CircularProgress color="primary" size={48} />
          <p className={styles.loaderText}>Extracting resume data...</p>
        </div>
      );
    }

    // State 3: Review - Resume Name + JSON Viewer
    return (
      <div className={`${styles.reviewContent} ${styles.scrollbarVerticalContainer}`}>
        <EnhancedTextField
          label="Resume Name"
          placeholder="Enter resume name"
          value={resumeName}
          onChange={handleNameChange}
          variant={nameError ? 'error' : 'default'}
          helperText={nameError}
        />
        {apiError && <p className={styles.apiError}>{apiError}</p>}
        <JsonViewer data={parsedData!} onEdit={setParsedData} />
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
        },
      }}
    >
      {renderContent()}
    </Modal>
  );
}

// JsonViewer component using react-json-view
interface JsonViewerProps {
  data: ResumeData;
  onEdit: (data: ResumeData) => void;
}

function JsonViewer({ data, onEdit }: JsonViewerProps) {
  // Handle edit callback - receives updated_src directly from react-json-view
  const handleEdit = (edit: InteractionProps) => {
    onEdit(edit.updated_src as ResumeData);
  };

  // Handle add callback - receives updated_src directly
  const handleAdd = (add: InteractionProps) => {
    onEdit(add.updated_src as ResumeData);
  };

  // Handle delete callback - receives updated_src directly
  const handleDelete = (del: InteractionProps) => {
    onEdit(del.updated_src as ResumeData);
  };

  // Custom theme matching app colors
  const theme = {
    base00: '#14121a', // --black-800 background
    base01: '#2e2e32', // --black-200
    base02: '#16171d', // --black-700
    base03: '#98989f', // --grey-500
    base04: '#65758529', // --grey-300
    base05: '#fff', // --white-900
    base06: '#fff', // --white-900
    base07: '#06b6d4', // --blue-500 accent
    base08: '#f14158', // --red-600
    base09: '#facc15', // --yellow-400
    base0A: '#4ade80', // --green-400
    base0B: '#06b6d4', // --blue-500
    base0C: '#06b6d4', // --blue-500
    base0D: '#06b6d4', // --blue-500 (for keys)
    base0E: '#06b6d4', // --blue-500
    base0F: '#f14158', // --red-600
  };

  return (
    <div className={`${styles.jsonViewerContainer} ${styles.scrollbarVerticalContainer}`}>
      <JsonView
        src={data}
        theme={theme}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onDelete={handleDelete}
        enableClipboard={false}
        displayDataTypes={false}
        displayObjectSize={true}
        indentWidth={2}
        iconStyle="triangle"
        collapseStringsAfterLength={50}
      />
    </div>
  );
}
