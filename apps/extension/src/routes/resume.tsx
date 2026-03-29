import { createFileRoute, ErrorComponent, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ResumeMetadata, ApiResponse, ResumeData } from '@repo/shared-types';
import styleConstants from '@repo/ui/constants/style-constants.js';
import styles from './style/settings.module.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  EnhancedButton,
  FileUploader,
  EnhancedChip,
  EnhancedTextField,
  EnhancedTooltipWithText,
} from '@repo/ui';
import { Box } from '@mui/material';

export interface ResumeSearch {
  personaId?: string;
  title?: string;
}

type ResumeListResponse =
  | {
      success: true;
      data: ResumeMetadata[];
      title: string | undefined;
    }
  | {
      success: false;
      error: string;
      title: string | undefined;
    };

type ConnectionStatus = { type: 'success' | 'error'; text: string } | null;

export const Route = createFileRoute('/resume')({
  shouldReload: true,
  validateSearch: (search: Record<string, unknown>): ResumeSearch => {
    return {
      personaId: search.personaId as string | undefined,
      title: search.title as string | undefined,
    };
  },
  loaderDeps: ({ search: { personaId, title } }) => ({ personaId, title }),
  loader: async ({ deps: { personaId, title } }) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return { resumes: [], title, error: null, personaId };
    }

    return new Promise<{
      resumes: ResumeMetadata[];
      error: string | null;
      title: string | undefined;
      personaId: string | undefined;
    }>((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'GET_RESUMES', payload: personaId ? { personaId } : undefined },
        (res: ResumeListResponse) => {
          if (res?.success && res.data) {
            resolve({
              resumes: res.data,
              error: null,
              title,
              personaId,
            });
          } else if (!res?.success) {
            resolve({
              resumes: [],
              title,
              error: res?.error || 'Failed to fetch resumes',
              personaId,
            });
          }
        }
      );
    });
  },
  component: ResumeComponent,
  pendingComponent: () => (
    <div style={{ color: styleConstants.white700, padding: '1rem' }}>Loading resumes...</div>
  ),
  errorComponent: ErrorComponent,
});

function ResumeComponent() {
  const { resumes: initialResumes, title, error: loaderError, personaId } = Route.useLoaderData();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeMetadata[]>(initialResumes || []);
  const [isAddingResume, setIsAddingResume] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<ConnectionStatus>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  // Computed step enables (similar to AiProvidersSection pattern)
  const step2Enabled = selectedFiles.length > 0; // File selected, can parse
  const step3Enabled = parsedData !== null; // File parsed, can save

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    // Reset parsed data when file changes
    setParsedData(null);
    setKeywords([]);
  };

  const handleParseFile = async () => {
    if (selectedFiles.length === 0) {
      setSaveStatus({ type: 'error', text: 'Please select a file to parse' });
      return;
    }

    setIsParsing(true);
    setSaveStatus(null);

    try {
      const file = selectedFiles[0] as File;
      const reader = new FileReader();

      reader.onload = async () => {
        const base64 = reader.result as string;
        const filePayload = {
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
        };

        const response = await new Promise<ApiResponse<ResumeData>>((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: 'PARSE_FILE_RESUME',
              payload: { file: filePayload },
            },
            (res: ApiResponse<ResumeData>) => {
              resolve(res);
            }
          );
        });

        setIsParsing(false);

        if (response.success && response.data) {
          setKeywords(response.data.keywords || []);
          if (response.data.keywords) {
            delete response.data.keywords;
          }
          setParsedData(response.data);
          setSaveStatus({ type: 'success', text: 'File parsed successfully' });
        } else {
          setSaveStatus({ type: 'error', text: response.message || 'Failed to parse file' });
        }
      };

      reader.onerror = () => {
        setSaveStatus({ type: 'error', text: 'Error reading file data' });
        setIsParsing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.log('Error parsing file', error);
      setSaveStatus({ type: 'error', text: 'An error occurred while parsing' });
      setIsParsing(false);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) return;
    setKeywords((prev) => [...prev, trimmed]);
    setKeywordInput('');
  };

  const handleDeleteKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (selectedFiles.length === 0) {
      setSaveStatus({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    if (!personaId) {
      setSaveStatus({ type: 'error', text: 'Persona ID is required' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const file = selectedFiles[0] as File;
      const reader = new FileReader();

      reader.onload = async () => {
        const base64 = reader.result as string;
        const filePayload = {
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
        };

        const response = await new Promise<ApiResponse<ResumeMetadata>>((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: 'CREATE_RESUME',
              payload: {
                personaId,
                file: filePayload,
                keywords: keywords.length > 0 ? keywords : undefined,
                parsedData: parsedData || undefined,
              },
            },
            (res: ApiResponse<ResumeMetadata>) => {
              resolve(res);
            }
          );
        });

        if (response.success && response.data) {
          setSaveStatus({ type: 'success', text: 'Resume uploaded successfully' });
          setResumes((prev) => [response.data!, ...prev]);
          setSelectedFiles([]);
          setParsedData(null);
          setKeywords([]);
          setIsAddingResume(false);
        } else {
          setSaveStatus({ type: 'error', text: response.message || 'Failed to upload resume' });
        }
        setIsSaving(false);
      };

      reader.onerror = () => {
        setSaveStatus({ type: 'error', text: 'Error reading file data' });
        setIsSaving(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.log('Error in resume', error);

      setSaveStatus({ type: 'error', text: 'An error occurred while uploading' });
      setIsSaving(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'DELETE_RESUME', payload: { id: resumeId } },
        (res: ApiResponse<null>) => {
          if (res?.success) {
            setResumes((prev) => prev.filter((r) => r.id !== resumeId));
          } else {
            setSaveStatus({ type: 'error', text: res?.message || 'Failed to delete resume' });
          }
        }
      );
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setParsedData(null);
    setKeywords([]);
    setKeywordInput('');
    setIsAddingResume(false);
    setSaveStatus(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewResume = async (resumeId: string) => {
    // Open the new tab synchronously to bypass popup blockers
    const newWindow = window.open('', `resume_view_${resumeId}`);
    if (!newWindow) {
      setSaveStatus({ type: 'error', text: 'Popup blocked. Please allow popups.' });
      return;
    }

    // Set a placeholder while waiting for the background response
    newWindow.document.body.innerHTML =
      '<div style="font-family: sans-serif; padding: 20px;">Loading document safely...</div>';

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_RESUME_BY_ID', payload: { id: resumeId } },
        (res: {
          success: boolean;
          data?: { array?: number[]; contentType: string; text?: string };
          fileName?: string;
          message?: string;
        }) => {
          try {
            if (res?.success && res.data && res.fileName) {
              newWindow.document.title = res.fileName;

              // Handle plain text content (TXT files)
              if (res.data.text) {
                newWindow.document.body.style.margin = '0';
                newWindow.document.body.style.padding = '0';
                newWindow.document.body.style.backgroundColor = '#1a1a1a';
                const escapedText = res.data.text
                  .replace(/&/g, '\x26amp;')
                  .replace(/</g, '\x26lt;')
                  .replace(/>/g, '\x26gt;');
                newWindow.document.body.innerHTML = `
                  <style>
                    html, body {
                      height: 100%;
                      margin: 0;
                      padding: 0;
                      overflow: hidden;
                    }
                    pre {
                      font-family: 'Courier New', monospace;
                      white-space: pre-wrap;
                      word-wrap: break-word;
                      padding: 20px;
                      margin: 0;
                      color: #e0e0e0;
                      background: #1a1a1a;
                      height: 100%;
                      box-sizing: border-box;
                      overflow: auto;
                    }
                  </style>
                  <pre>${escapedText}</pre>
                `;
                return;
              }

              // Handle binary files (PDF, DOCX, etc.) with iframe
              if (res.data.array) {
                const byteArray = new Uint8Array(res.data.array);
                const blob = new Blob([byteArray], { type: res.data.contentType });
                const url = URL.createObjectURL(blob);

                newWindow.document.body.style.margin = '0';
                newWindow.document.body.style.padding = '0';
                newWindow.document.body.style.backgroundColor = '#333';

                const iframe = newWindow.document.createElement('iframe');
                iframe.src = url;
                iframe.style.width = '100vw';
                iframe.style.height = '100vh';
                iframe.style.border = 'none';

                newWindow.document.body.innerHTML = '';
                newWindow.document.body.appendChild(iframe);
                return;
              }

              // If none of the above, show error
              newWindow.close();
              setSaveStatus({
                type: 'error',
                text: 'Failed to render document',
              });
            } else {
              newWindow.close();
              setSaveStatus({
                type: 'error',
                text: res?.message || 'Failed to initialize resume viewer',
              });
            }
          } catch (e) {
            console.error('Document view error:', e);
            newWindow.close();
            setSaveStatus({ type: 'error', text: 'An error occurred while loading the document.' });
          }
        }
      );
    }
  };

  const toggleKeywords = (resumeId: string) => {
    setExpandedKeywords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resumeId)) {
        newSet.delete(resumeId);
      } else {
        newSet.add(resumeId);
      }
      return newSet;
    });
  };

  if (loaderError) {
    return (
      <div style={{ color: '#fff', padding: '1rem' }}>
        <p>Error: {loaderError}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate({ to: '/settings' })}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </button>
        <h1 className={styles.headerTitle}>{title || ''}</h1>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>RESUMES</span>
          <EnhancedButton
            colorTheme="tertiary"
            size="small"
            label="Add New"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setIsAddingResume(true)}
          />
        </div>
      </section>

      {isAddingResume && (
        <div className={styles.card}>
          <div className={styles.addProviderForm}>
            {/* Step 1: File Upload */}
            <div className={styles.formField}>
              <FileUploader
                onFilesSelected={handleFilesSelected}
                onError={(err) => {
                  if (err) {
                    setSaveStatus({ type: 'error', text: err });
                  } else {
                    setSaveStatus(null);
                  }
                }}
                acceptedFormats={['.pdf', '.txt', '.docx']}
                maxFiles={1}
                maxSizeMB={10}
                testId="resume-uploader"
              />
            </div>

            {/* Step 2: Parse Button */}
            <div className={styles.formField}>
              <div className={styles.testConnectionRow}>
                <EnhancedButton
                  colorTheme="secondary"
                  className={styles.testBtn}
                  onClick={handleParseFile}
                  disabled={!step2Enabled || isParsing || isSaving}
                  label={isParsing ? 'Parsing…' : 'Parse'}
                  size="medium"
                  startIcon={<AutoAwesomeIcon fontSize="small" />}
                  customProps={{ props: { sx: { width: '100%', maxWidth: '100%' } } }}
                />
              </div>
            </div>

            {/* Step 3: Keywords Section (shown after parse) */}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className={styles.row} style={{ alignItems: 'flex-start' }}>
                <div
                  className={styles.formField}
                  style={{ flexDirection: 'row', alignItems: 'end', width: '100%' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EnhancedTextField
                      label="Keywords"
                      variant={!step3Enabled || isSaving ? 'disabled' : 'default'}
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="Enter keywords"
                      helperText="Press Enter to add"
                    />
                  </div>
                  <EnhancedButton
                    label="Add"
                    colorTheme="secondary"
                    onClick={handleAddKeyword}
                    disabled={isSaving || !keywordInput.trim() || !step3Enabled}
                  />
                </div>
              </div>
              {step3Enabled && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {keywords.map((keyword, index) => (
                    <EnhancedChip
                      key={`keyword-${index}`}
                      id={`keyword-chip-${index}`}
                      testId={`keyword-chip-${index}`}
                      label={keyword}
                      showDeleteIcon={!isSaving}
                      onDelete={() => handleDeleteKeyword(index)}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {saveStatus && (
              <div
                className={`${styles.connectionResult} ${
                  saveStatus.type === 'success' ? styles.connectionSuccess : styles.connectionError
                }`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircleIcon fontSize="small" />
                ) : (
                  <ErrorOutlineIcon fontSize="small" />
                )}
                <span>{saveStatus.text}</span>
              </div>
            )}
          </div>

          {/* Step 4: Footer with Save and Cancel */}
          <div className={styles.footer}>
            {/* Actions */}
            <div className={styles.formActions}>
              <EnhancedButton
                label={isSaving ? 'Saving…' : 'Save'}
                colorTheme="primary"
                onClick={handleSave}
                disabled={!step3Enabled || isSaving || isParsing}
              />
              <EnhancedButton colorTheme="tertiary" onClick={resetForm} label="Cancel" />
            </div>
          </div>
        </div>
      )}

      <span className={styles.sectionHeading} style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
        UPLOADED RESUMES
      </span>

      {resumes.length === 0 ? (
        <div className={styles.providerList} style={{ marginTop: 0 }}>
          <span className={styles.usageText}>No resumes uploaded yet.</span>
        </div>
      ) : (
        <div className={styles.providerList} style={{ marginTop: 0 }}>
          {resumes.map((resume) => (
            <div key={resume.id} className={styles.resumeItemWrapper}>
              <div className={styles.providerItem}>
                <div className={styles.providerInfo}>
                  <div
                    className={styles.providerDetails}
                    style={{ overflow: 'hidden', minWidth: 0 }}
                  >
                    <div
                      className={styles.providerNameRow}
                      style={{ overflow: 'hidden', minWidth: 0, width: '100%' }}
                    >
                      <EnhancedTooltipWithText
                        description={resume.fileName}
                        showIcon={false}
                        placement="top-start"
                        customProps={{
                          childProps: {
                            childrenBox: {
                              sx: { minWidth: 0, flex: 1, overflow: 'hidden', width: '100%' },
                            },
                          },
                        }}
                      >
                        <span
                          className={styles.providerName}
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                          }}
                        >
                          {resume.fileName}
                        </span>
                      </EnhancedTooltipWithText>
                    </div>
                    <span className={styles.usageText} style={{ display: 'block' }}>
                      {formatFileSize(resume.fileSize)}
                    </span>
                  </div>
                </div>
                <div className={styles.resumeActions}>
                  <button
                    className={styles.settingsBtn}
                    aria-label="View resume"
                    onClick={() => handleViewResume(resume.id)}
                    title="View resume in new tab"
                  >
                    <VisibilityIcon fontSize="small" />
                  </button>
                  <button
                    className={styles.settingsBtn}
                    aria-label="Delete resume"
                    onClick={() => handleDeleteResume(resume.id)}
                    style={{
                      color: styleConstants.red700,
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </button>
                </div>
              </div>
              <button
                className={styles.keywordsToggle}
                onClick={() => toggleKeywords(resume.id)}
                aria-label={expandedKeywords.has(resume.id) ? 'Hide keywords' : 'Show keywords'}
              >
                {expandedKeywords.has(resume.id) ? (
                  <KeyboardArrowUpIcon fontSize="small" />
                ) : (
                  <KeyboardArrowDownIcon fontSize="small" />
                )}
                <span>Keywords ({resume.keywords?.length || 0})</span>
              </button>
              {expandedKeywords.has(resume.id) && resume.keywords && resume.keywords.length > 0 && (
                <div className={styles.keywordsContainer}>
                  {resume.keywords.map((keyword, index) => (
                    <EnhancedChip
                      key={`${keyword}-${index}`}
                      id={`keyword-${resume.id}-${index}`}
                      testId={`keyword-chip-${resume.id}-${index}`}
                      label={keyword}
                      showDeleteIcon={false}
                    />
                  ))}
                </div>
              )}
              {expandedKeywords.has(resume.id) &&
                (!resume.keywords || resume.keywords.length === 0) && (
                  <span className={styles.noKeywords}>No keywords extracted</span>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
