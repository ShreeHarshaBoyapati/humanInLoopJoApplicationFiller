import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { EnhancedButton } from '@repo/ui';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { Persona, ResumeMetadata, ResumeVersionMetadata } from '@repo/shared-types';
import styles from '../routes/style/step2-select-resume.module.css';

export interface Step2SelectResumeProps {
  savedJobId: string | null;
  selectedPersonaId: string | null;
  selectedResumeId: string | null;
  onChange: (personaId: string | null, resumeId: string | null) => void;
}

interface ActiveSelectionInfo {
  persona: Persona | null;
  resume: ResumeMetadata | null;
  version: ResumeVersionMetadata | null;
}

export const Step2SelectResume = ({ savedJobId, onChange }: Step2SelectResumeProps) => {
  const navigate = useNavigate();
  const [activeInfo, setActiveInfo] = useState<ActiveSelectionInfo>({
    persona: null,
    resume: null,
    version: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active persona, resume, and version in parallel
  useEffect(() => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_ACTIVE_SELECTION' },
        (res: { success: boolean; data?: ActiveSelectionInfo; error?: string }) => {
          setLoading(false);
          if (res?.success && res.data) {
            setActiveInfo(res.data);
            if (res.data.persona && res.data.resume) {
              onChange(res.data.persona.id, res.data.resume.id);
            }
          } else if (res?.error) {
            setError(res.error);
          }
        }
      );
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome.runtime]);

  const handleChangeSelection = () => {
    navigate({
      to: '/autofill/select-persona',
      search: { jobId: savedJobId || undefined },
    });
  };

  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingContainer}>Loading active selection...</div>
      ) : (
        <>
          {/* Active Version Display */}
          {activeInfo.version && (
            <div className={styles.activeSection}>
              <div className={styles.activeHeader}>
                <span className={styles.activeLabel}>ACTIVE VERSION</span>
              </div>
              <div className={styles.activeCard}>
                <span className={styles.activeName}>{activeInfo.version.versionName}</span>
                <span className={styles.activeMeta}>
                  {formatFileSize(activeInfo.version.fileSize)}
                </span>
              </div>
            </div>
          )}

          {/* Parent Resume Display */}
          {activeInfo.resume && (
            <div className={styles.hierarchySection}>
              <div className={styles.hierarchyLabel}>Resume</div>
              <div className={styles.hierarchyCard}>
                <span className={styles.hierarchyName}>{activeInfo.resume.fileName}</span>
              </div>
            </div>
          )}

          {/* Parent Persona Display */}
          {activeInfo.persona && (
            <div className={styles.hierarchySection}>
              <div className={styles.hierarchyLabel}>Persona</div>
              <div className={styles.hierarchyCard}>
                <span className={styles.hierarchyName}>{formatName(activeInfo.persona.title)}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className={styles.noSelectionSection}>
              <div className={styles.noSelectionText}>{error}</div>
            </div>
          )}

          {!error && (!activeInfo.persona || !activeInfo.resume || !activeInfo.version) && (
            <div className={styles.noSelectionSection}>
              <div className={styles.noSelectionText}>No active resume found.</div>
            </div>
          )}

          {/* Change Selection Button */}
          <div className={styles.changeSection}>
            <div className={styles.changeQuestion}>Want to change the active version?</div>
            <EnhancedButton
              label="Change"
              colorTheme="primary"
              size="medium"
              startIcon={<EditOutlinedIcon fontSize="small" />}
              onClick={handleChangeSelection}
            />
          </div>
        </>
      )}
    </div>
  );
};
