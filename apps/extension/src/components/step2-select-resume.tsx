import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { EnhancedButton, EnhancedTooltipWithText } from '@repo/ui';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { Persona, ResumeMetadata } from '@repo/shared-types';
import styles from '../routes/style/step2-select-resume.module.css';

export interface Step2SelectResumeProps {
  savedJobId: string | null;
  selectedPersonaId: string | null;
  selectedResumeId: string | null;
  onChange: (personaId: string | null, resumeId: string | null) => void;
}

export const Step2SelectResume = ({
  savedJobId,
  selectedPersonaId,
  selectedResumeId,
  onChange,
}: Step2SelectResumeProps) => {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [resumes, setResumes] = useState<ResumeMetadata[]>([]);

  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [expandedResumes, setExpandedResumes] = useState<Set<string>>(new Set());

  const toggleKeywords = (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    setExpandedResumes((prev) => {
      const next = new Set(prev);
      if (next.has(resumeId)) next.delete(resumeId);
      else next.add(resumeId);
      return next;
    });
  };

  // Fetch personas on mount
  useEffect(() => {
    setLoadingPersonas(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_PERSONAS' },
        (res: { success: boolean; data?: Persona[]; error?: string }) => {
          setLoadingPersonas(false);
          if (res?.success && res.data) {
            setPersonas(res.data);
            // Default select the active persona
            if (!selectedPersonaId) {
              const activePersona = res.data.find((p) => p.active) || res.data[0];
              if (activePersona) {
                onChange(activePersona.id, selectedResumeId);
              }
            }
          }
        }
      );
    } else {
      setLoadingPersonas(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch resumes when selected persona changes
  useEffect(() => {
    if (!selectedPersonaId) {
      setResumes([]);
      return;
    }
    setLoadingResumes(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_RESUMES', payload: { personaId: selectedPersonaId } },
        (res: { success: boolean; data?: ResumeMetadata[]; error?: string }) => {
          setLoadingResumes(false);
          if (res?.success && res.data) {
            setResumes(res.data);
            // Default select the first resume if none selected
            if (!selectedResumeId && res.data.length > 0) {
              onChange(selectedPersonaId, res.data[0]!.id);
            } else if (res.data.length === 0) {
              onChange(selectedPersonaId, null);
            }
          } else {
            setResumes([]);
            onChange(selectedPersonaId, null);
          }
        }
      );
    } else {
      setLoadingResumes(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonaId]);

  const handleEditPersona = () => {
    navigate({
      to: '/settings',
      search: (prev) => ({
        ...prev,
        returnTo: '/autofill',
        jobId: savedJobId || undefined,
        step: 1,
      }),
    });
  };

  const handleEditResume = () => {
    navigate({
      to: '/settings',
      search: (prev) => ({
        ...prev,
        returnTo: '/autofill',
        jobId: savedJobId || undefined,
        step: 1,
      }),
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className={styles.container}>
      {/* Personas Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>SELECT PERSONA</span>
          <EnhancedButton
            label="Edit Persona"
            colorTheme="tertiary"
            size="small"
            startIcon={<EditOutlinedIcon fontSize="small" />}
            onClick={handleEditPersona}
          />
        </div>

        {loadingPersonas ? (
          <div className={styles.messageText}>Loading personas...</div>
        ) : personas.length === 0 ? (
          <div className={styles.messageText}>
            No personas configured. Please add one in settings.
          </div>
        ) : (
          <div className={styles.cardList}>
            {personas.map((p) => {
              const isSelected = p.id === selectedPersonaId;
              return (
                <div
                  key={p.id}
                  className={`${styles.providerItem} ${isSelected ? styles.selectedProviderItem : ''}`}
                  onClick={() => onChange(p.id, null)}
                >
                  <div className={styles.cardContent}>
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => onChange(p.id, null)}
                      className={styles.radioInput}
                    />
                    <div className={styles.providerInfo}>
                      <div className={styles.providerDetails}>
                        <div className={styles.providerNameRow}>
                          <span className={styles.providerNameWrapper}>
                            <EnhancedTooltipWithText
                              description={formatName(p.title)}
                              showIcon={false}
                              placement="top-start"
                              customProps={{
                                childProps: {
                                  childrenBox: {
                                    sx: { minWidth: 0, flex: 1 },
                                  },
                                },
                              }}
                            >
                              <span className={styles.providerName}>{formatName(p.title)}</span>
                            </EnhancedTooltipWithText>
                          </span>
                          {p.active && <span className={styles.activeTag}>ACTIVE</span>}
                        </div>
                        <span className={styles.usageText}>
                          {p.keywords?.join(', ') || 'No keywords'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumes Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>SELECT RESUME</span>
          <EnhancedButton
            label="Edit Resume"
            colorTheme="tertiary"
            size="small"
            startIcon={<ArticleOutlinedIcon fontSize="small" />}
            onClick={handleEditResume}
          />
        </div>

        {loadingResumes ? (
          <div className={styles.messageText}>Loading resumes...</div>
        ) : !selectedPersonaId ? (
          <div className={styles.messageText}>Please select a persona first.</div>
        ) : resumes.length === 0 ? (
          <div className={styles.messageText}>No resumes found for this persona.</div>
        ) : (
          <div className={styles.cardList}>
            {resumes.map((resume) => {
              const isSelected = resume.id === selectedResumeId;
              return (
                <div
                  key={resume.id}
                  className={`${styles.providerItem} ${styles.resumeCard} ${isSelected ? styles.selectedProviderItem : ''}`}
                  onClick={() => onChange(selectedPersonaId, resume.id)}
                >
                  <div className={styles.resumeCardHeader}>
                    <div className={styles.cardContentTop}>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => onChange(selectedPersonaId, resume.id)}
                        className={styles.radioInputTop}
                      />
                      <div className={styles.providerInfo}>
                        <div className={styles.providerDetails}>
                          <div className={styles.providerNameRow}>
                            <span className={styles.providerNameWrapper}>
                              <EnhancedTooltipWithText
                                description={resume.fileName}
                                showIcon={false}
                                placement="top-start"
                                customProps={{
                                  childProps: {
                                    childrenBox: {
                                      sx: { minWidth: 0, flex: 1 },
                                    },
                                  },
                                }}
                              >
                                <span className={styles.providerName}>{resume.fileName}</span>
                              </EnhancedTooltipWithText>
                            </span>
                          </div>
                          <span className={styles.usageText}>
                            {formatFileSize(resume.fileSize)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* The accordion toggle button */}
                    <button
                      className={styles.keywordsToggle}
                      onClick={(e) => toggleKeywords(e, resume.id)}
                      aria-label="Toggle Keywords"
                    >
                      {expandedResumes.has(resume.id) ? (
                        <KeyboardArrowUpIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowDownIcon fontSize="small" />
                      )}
                    </button>
                  </div>

                  {/* Selected Resume Keywords */}
                  {expandedResumes.has(resume.id) &&
                    resume.keywords &&
                    resume.keywords.length > 0 && (
                      <div className={styles.keywordContainer}>
                        {resume.keywords.map((k, i) => (
                          <span key={i} className={styles.keywordChip}>
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons specific to Step 2 (Optional, but parent handles bottom actions usually) */}
    </div>
  );
};
