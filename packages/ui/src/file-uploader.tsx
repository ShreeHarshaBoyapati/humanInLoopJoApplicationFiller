import { useState, useCallback, useRef } from 'react';
import { Box, styled, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import { EnhancedButton } from './button';
import styleConstants from './constants/style-constants';

export interface FileDisplayFile {
  name: string;
  size: number;
}

export interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  onError?: (error: string) => void;
  acceptedFormats?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  testId?: string;
  disabled?: boolean;
  showFilesOnly?: boolean;
  displayFiles?: FileDisplayFile[];
  value?: File[];
  customProps?: {
    props?: Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'onClick' | 'disabled' | 'className'>;
    childProps?: {
      uploadContainer?: React.HTMLAttributes<HTMLDivElement>;
      iconWrapper?: React.HTMLAttributes<HTMLDivElement>;
      button?: Omit<
        React.ComponentProps<typeof EnhancedButton>,
        'label' | 'colorTheme' | 'onClick' | 'disabled'
      >;
      filesList?: React.HTMLAttributes<HTMLDivElement>;
      fileItem?: React.HTMLAttributes<HTMLDivElement>;
      fileInfo?: React.HTMLAttributes<HTMLDivElement>;
      removeButton?: Omit<React.HTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'>;
    };
  };
}

const UploadContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragging' && prop !== 'disabled',
})<{ isDragging?: boolean; disabled?: boolean }>(({ isDragging, disabled }) => ({
  backgroundColor: styleConstants.black800,
  borderRadius: styleConstants.borderRadius,
  border: `2px dashed ${isDragging ? styleConstants.blue500 : styleConstants.grey700}`,
  padding: `calc(${styleConstants.spacing} * 8)`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: `calc(${styleConstants.spacing} * 4)`,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: disabled ? styleConstants.grey700 : styleConstants.blue500,
  },
}));

const IconWrapper = styled(Box)({
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: styleConstants.blue500,
});

const FilesList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: `calc(${styleConstants.spacing} * 2)`,
  width: '100%',
  marginTop: `calc(${styleConstants.spacing} * 4)`,
});

const FileItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: styleConstants.black700,
  borderRadius: styleConstants.borderRadius,
  padding: `calc(${styleConstants.spacing} * 2) calc(${styleConstants.spacing} * 3)`,
  border: `1px solid ${styleConstants.grey700}`,
});

const FileInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: `calc(${styleConstants.spacing} * 2)`,
  overflow: 'hidden',
});

const RemoveButton = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: styleConstants.grey500,
  padding: `calc(${styleConstants.spacing})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s ease-in-out',
  '&:hover': {
    color: styleConstants.red600,
  },
});

const HiddenInput = styled('input')({
  display: 'none',
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploader = ({
  onFilesSelected,
  onError,
  acceptedFormats = ['.pdf', '.doc', '.docx'],
  maxFiles = 1,
  maxSizeMB = 5,
  testId = '',
  disabled = false,
  showFilesOnly = false,
  displayFiles,
  value,
  customProps,
}: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external value if provided, otherwise use internal state
  const selectedFiles = value !== undefined ? value : internalSelectedFiles;

  const setSelectedFiles = (files: File[]) => {
    if (value === undefined) {
      setInternalSelectedFiles(files);
    }
  };

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      const filesArray = Array.from(files);
      const validFiles: File[] = [];
      let errorMessage = '';

      for (const file of filesArray) {
        if (validFiles.length >= maxFiles) break;

        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidFormat = acceptedFormats.some(
          (format) => format.toLowerCase() === fileExtension
        );
        const isValidSize = file.size <= maxSizeMB * 1024 * 1024;

        if (!isValidFormat) {
          errorMessage = `Invalid format. Accepted formats: ${acceptedFormats.join(', ')}`;
        } else if (!isValidSize) {
          errorMessage = `File size exceeds the ${maxSizeMB}MB limit`;
        } else {
          validFiles.push(file);
        }
      }

      if (errorMessage && validFiles.length === 0) {
        onError?.(errorMessage);
      } else if (validFiles.length > 0) {
        onError?.('');
      }

      setSelectedFiles(validFiles);
      onFilesSelected?.(validFiles);
    },
    [acceptedFormats, maxFiles, maxSizeMB, onFilesSelected, onError, disabled]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (!disabled) {
        processFiles(event.dataTransfer.files);
      }
    },
    [processFiles, disabled]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(event.target.files);
      event.target.value = '';
    },
    [processFiles]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      if (value !== undefined) {
        onFilesSelected?.(newFiles);
      } else {
        setSelectedFiles(newFiles);
        onFilesSelected?.(newFiles);
      }
    },
    [selectedFiles, onFilesSelected, value]
  );

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!disabled) {
        fileInputRef.current?.click();
      }
    },
    [disabled]
  );

  const formatLabel = acceptedFormats.map((f) => f.replace('.', '').toUpperCase()).join(', ');

  // Determine which files to show
  const filesToShow = showFilesOnly && displayFiles ? displayFiles : selectedFiles;

  return (
    <Box data-testid={testId} {...(customProps?.props || {})}>
      {!showFilesOnly && (
        <>
          <UploadContainer
            isDragging={isDragging}
            disabled={disabled}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleContainerClick}
            {...(customProps?.childProps?.uploadContainer || {})}
          >
            <IconWrapper {...(customProps?.childProps?.iconWrapper || {})}>
              <CloudUploadIcon sx={{ fontSize: 48 }} />
            </IconWrapper>

            <Typography
              variant="body1"
              sx={{
                color: styleConstants.white700,
                textAlign: 'center',
              }}
            >
              Drag & drop files here, or click to browse
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: styleConstants.grey500,
                textAlign: 'center',
              }}
            >
              Supported formats: {formatLabel}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: styleConstants.grey500,
                textAlign: 'center',
              }}
            >
              Max file size: {maxSizeMB}MB
            </Typography>

            <EnhancedButton
              label="Browse Files"
              colorTheme="secondary"
              onClick={handleButtonClick}
              disabled={disabled}
              {...(customProps?.childProps?.button || {})}
            />
          </UploadContainer>

          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileChange}
            disabled={disabled}
            multiple={maxFiles > 1}
          />
        </>
      )}

      {(selectedFiles.length > 0 || (showFilesOnly && displayFiles && displayFiles.length > 0)) && (
        <FilesList {...(customProps?.childProps?.filesList || {})}>
          {filesToShow.map((file, index) => (
            <FileItem key={`${file.name}-${index}`} {...(customProps?.childProps?.fileItem || {})}>
              <FileInfo {...(customProps?.childProps?.fileInfo || {})}>
                <InsertDriveFileIcon
                  sx={{
                    color: styleConstants.blue500,
                    fontSize: 20,
                  }}
                />
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: styleConstants.white900,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: styleConstants.grey500,
                    }}
                  >
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
              </FileInfo>
              {!showFilesOnly && (
                <RemoveButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  type="button"
                  {...(customProps?.childProps?.removeButton || {})}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </RemoveButton>
              )}
            </FileItem>
          ))}
        </FilesList>
      )}
    </Box>
  );
};

FileUploader.displayName = 'FileUploader';
