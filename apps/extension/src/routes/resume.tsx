import { createFileRoute, ErrorComponent, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ResumeMetadata, ApiResponse } from '@repo/shared-types';
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
import { EnhancedButton, FileUploader, EnhancedChip } from '@repo/ui';

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

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
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
          data?: { array: number[]; contentType: string };
          fileName?: string;
          message?: string;
        }) => {
          try {
            if (res?.success && res.data && res.fileName) {
              const byteArray = new Uint8Array(res.data.array);
              const blob = new Blob([byteArray], { type: res.data.contentType });
              const url = URL.createObjectURL(blob);

              newWindow.document.title = res.fileName;
              newWindow.document.body.style.margin = '0';
              newWindow.document.body.style.padding = '0';
              newWindow.document.body.style.overflow = 'hidden';
              newWindow.document.body.style.backgroundColor = '#333';

              const iframe = newWindow.document.createElement('iframe');
              iframe.src = url;
              iframe.style.width = '100vw';
              iframe.style.height = '100vh';
              iframe.style.border = 'none';

              newWindow.document.body.innerHTML = '';
              newWindow.document.body.appendChild(iframe);
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
                acceptedFormats={['.pdf', '.doc', '.docx']}
                maxFiles={1}
                maxSizeMB={10}
                testId="resume-uploader"
              />
            </div>
          </div>
          <div className={styles.footer}>
            {/* Save status */}
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

            {/* Actions */}
            <div className={styles.formActions}>
              <EnhancedButton
                label={isSaving ? 'Saving…' : 'Upload'}
                colorTheme="primary"
                onClick={handleSave}
                disabled={isSaving || selectedFiles.length === 0}
              />
              <EnhancedButton colorTheme="secondary" onClick={resetForm} label="Cancel" />
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
                  <div className={styles.providerDetails}>
                    <div className={styles.providerNameRow}>
                      <span className={styles.providerName}>{resume.fileName}</span>
                    </div>
                    <span className={styles.usageText}>{formatFileSize(resume.fileSize)}</span>
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
