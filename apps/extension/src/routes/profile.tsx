import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type {
  Persona,
  ResumeData,
  ResumeMetadata,
  ResumeVersionMetadata,
} from '@repo/shared-types';
import styles from './style/profile.module.css';

type ActiveSelectionResponse = {
  success: boolean;
  data?: {
    persona: Persona | null;
    resume: ResumeMetadata | null;
    version: ResumeVersionMetadata | null;
  };
  error?: string;
};
type ParsedResumeResponse = { success: boolean; data?: ResumeData; error?: string };

interface ActiveSelectionInfo {
  persona: Persona | null;
  resume: ResumeMetadata | null;
  version: ResumeVersionMetadata | null;
}

export const Route = createFileRoute('/profile')({
  component: RouteComponent,
});

// Helper to send messages to background
function sendMessage<T>(message: object): Promise<T> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(message, (res: T) => {
        resolve(res);
      });
    } else {
      resolve(undefined as T);
    }
  });
}

function RouteComponent() {
  const navigate = useNavigate();
  const [activeInfo, setActiveInfo] = useState<ActiveSelectionInfo>({
    persona: null,
    resume: null,
    version: null,
  });
  const [parsedResumeData, setParsedResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['profile', 'experience', 'education', 'skills'])
  );

  // Copy feedback state
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // Initial data load - use GET_ACTIVE_SELECTION like step2-select-resume.tsx
  useEffect(() => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'GET_ACTIVE_SELECTION' },
        async (res: ActiveSelectionResponse) => {
          setLoading(false);
          if (res?.success && res.data) {
            setActiveInfo(res.data);

            // If we have both resume and version, fetch parsed data
            if (res.data.resume && res.data.version) {
              const parsedRes = await sendMessage<ParsedResumeResponse>({
                action: 'GET_VERSION_PARSED_DATA',
                payload: {
                  resumeId: res.data.resume.id,
                  versionId: res.data.version.id,
                },
              });
              if (parsedRes?.success && parsedRes?.data) {
                setParsedResumeData(parsedRes.data);
              } else if (parsedRes?.error) {
                setError(parsedRes.error);
              }
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

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set(prev).add(itemId));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format name for display
  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate({ to: '/' })}>
            <ArrowBackIcon />
          </button>
          <h1 className={styles.headerTitle}>Profile</h1>
        </div>
        <div className={styles.loading}>
          <span className={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  // Destructure for easier access
  const { persona: activePersona, resume: activeResume, version: activeVersion } = activeInfo;

  // Show empty state if no active persona
  if (!activePersona) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Profile</h1>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyStateText}>
            {error || 'No active persona found. Please create and activate a persona in Persona.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Profile</h1>
      </div>

      {/* Active Version Display */}
      {activeVersion && (
        <div className={styles.activeSection}>
          <div className={styles.activeHeader}>
            <span className={styles.activeLabel}>VERSION</span>
          </div>
          <div className={styles.activeCard}>
            <span className={styles.activeName}>{activeVersion.versionName}</span>
            <span className={styles.activeMeta}>
              {activeVersion.fileSize ? formatFileSize(activeVersion.fileSize) : 'Unknown size'}
            </span>
          </div>
        </div>
      )}

      {/* Parent Resume Display */}
      {activeResume && (
        <div className={styles.hierarchySection}>
          <div className={styles.hierarchyLabel}>Resume</div>
          <div className={styles.hierarchyCard}>
            <span className={styles.hierarchyName}>{activeResume.fileName}</span>
          </div>
        </div>
      )}

      {/* Parent Persona Display */}
      {activePersona && (
        <div className={styles.hierarchySection}>
          <div className={styles.hierarchyLabel}>Persona</div>
          <div className={styles.hierarchyCard}>
            <span className={styles.hierarchyName}>{formatName(activePersona.title)}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateText}>{error}</span>
        </div>
      )}

      {/* Instruction Banner and Sections - Only show when no error and active resume exists */}
      {!error && activeResume && (
        <>
          <div className={styles.instructionBanner}>
            <p>Click any block of text below to copy it!</p>
            <p>Reference your profile to fill out your application</p>
          </div>

          {/* Sections */}
          <div className={styles.sectionsContainer}>
            {/* Profile Section */}
            <SectionCard
              title="Profile"
              isExpanded={expandedSections.has('profile')}
              onToggle={() => toggleSection('profile')}
              onCopyAll={() => {
                if (!parsedResumeData) return;
                const lines: string[] = [];
                if (parsedResumeData.current_title)
                  lines.push(`Current Title: ${parsedResumeData.current_title}`);
                if (parsedResumeData.years_experience !== null)
                  lines.push(`Years of Experience: ${parsedResumeData.years_experience}`);
                if (parsedResumeData.summary) lines.push(`Summary: ${parsedResumeData.summary}`);
                if (parsedResumeData.personal) {
                  if (parsedResumeData.personal.name)
                    lines.push(`Name: ${parsedResumeData.personal.name}`);
                  if (parsedResumeData.personal.email)
                    lines.push(`Email: ${parsedResumeData.personal.email}`);
                  if (parsedResumeData.personal.phone)
                    lines.push(`Phone: ${parsedResumeData.personal.phone}`);
                  if (parsedResumeData.personal.location)
                    lines.push(`Location: ${parsedResumeData.personal.location}`);
                  if (parsedResumeData.personal.linkedin)
                    lines.push(`LinkedIn: ${parsedResumeData.personal.linkedin}`);
                }
                copyToClipboard(lines.join('\n'), 'profile-all');
              }}
              showCopyAll={expandedSections.has('profile')}
            >
              {parsedResumeData?.current_title && (
                <CopyableLine
                  label="Current Title"
                  value={parsedResumeData.current_title}
                  itemId="current_title"
                  isCopied={copiedItems.has('current_title')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.years_experience !== null && (
                <CopyableLine
                  label="Years of Experience"
                  value={String(parsedResumeData?.years_experience ?? 'Not specified')}
                  itemId="years_experience"
                  isCopied={copiedItems.has('years_experience')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.summary && (
                <CopyableLine
                  label="Summary"
                  value={parsedResumeData.summary}
                  itemId="summary"
                  isCopied={copiedItems.has('summary')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.personal?.name && (
                <CopyableLine
                  label="Name"
                  value={parsedResumeData.personal.name}
                  itemId="name"
                  isCopied={copiedItems.has('name')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.personal?.email && (
                <CopyableLine
                  label="Email"
                  value={parsedResumeData.personal.email}
                  itemId="email"
                  isCopied={copiedItems.has('email')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.personal?.phone && (
                <CopyableLine
                  label="Phone"
                  value={parsedResumeData.personal.phone}
                  itemId="phone"
                  isCopied={copiedItems.has('phone')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.personal?.location && (
                <CopyableLine
                  label="Location"
                  value={parsedResumeData.personal.location}
                  itemId="location"
                  isCopied={copiedItems.has('location')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.personal?.linkedin && (
                <CopyableLine
                  label="LinkedIn"
                  value={parsedResumeData.personal.linkedin}
                  itemId="linkedin"
                  isCopied={copiedItems.has('linkedin')}
                  onCopy={copyToClipboard}
                />
              )}
            </SectionCard>

            {/* Experience Section */}
            <SectionCard
              title="Experience"
              isExpanded={expandedSections.has('experience')}
              onToggle={() => toggleSection('experience')}
              onCopyAll={() => {
                if (!parsedResumeData?.experience?.length) return;
                const lines: string[] = [];
                parsedResumeData.experience.forEach((exp, idx) => {
                  lines.push(`Experience ${idx + 1}:`);
                  if (exp.role) lines.push(`  Role: ${exp.role}`);
                  if (exp.company) lines.push(`  Company: ${exp.company}`);
                  if (exp.duration) lines.push(`  Duration: ${exp.duration}`);
                  if (exp.location) lines.push(`  Location: ${exp.location}`);
                  if (exp.bullets?.length) {
                    lines.push('  Description:');
                    exp.bullets.forEach((bullet) => lines.push(`    - ${bullet}`));
                  }
                  lines.push('');
                });
                copyToClipboard(lines.filter((l) => l.trim()).join('\n'), 'experience-all');
              }}
              showCopyAll={
                expandedSections.has('experience') && !!parsedResumeData?.experience?.length
              }
            >
              {parsedResumeData?.experience && parsedResumeData.experience.length > 0 ? (
                parsedResumeData.experience.map((exp, index) => (
                  <ExperienceBlock
                    key={`exp-${index}`}
                    experience={exp}
                    index={index}
                    copiedItems={copiedItems}
                    onCopy={copyToClipboard}
                  />
                ))
              ) : (
                <span className={styles.emptyStateText}>No experience data available</span>
              )}
            </SectionCard>

            {/* Education Section */}
            <SectionCard
              title="Education"
              isExpanded={expandedSections.has('education')}
              onToggle={() => toggleSection('education')}
              onCopyAll={() => {
                if (!parsedResumeData?.education?.length) return;
                const lines: string[] = [];
                parsedResumeData.education.forEach((edu, idx) => {
                  lines.push(`Education ${idx + 1}:`);
                  if (edu.degree) {
                    lines.push(`  Degree: ${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`);
                  }
                  if (edu.institution) lines.push(`  Institution: ${edu.institution}`);
                  if (edu.year) lines.push(`  Year: ${edu.year}`);
                  if (edu.gpa) lines.push(`  GPA: ${edu.gpa}`);
                  lines.push('');
                });
                copyToClipboard(lines.filter((l) => l.trim()).join('\n'), 'education-all');
              }}
              showCopyAll={
                expandedSections.has('education') && !!parsedResumeData?.education?.length
              }
            >
              {parsedResumeData?.education && parsedResumeData.education.length > 0 ? (
                parsedResumeData.education.map((edu, index) => (
                  <EducationBlock
                    key={`edu-${index}`}
                    education={edu}
                    index={index}
                    copiedItems={copiedItems}
                    onCopy={copyToClipboard}
                  />
                ))
              ) : (
                <span className={styles.emptyStateText}>No education data available</span>
              )}
            </SectionCard>

            {/* Skills Section */}
            <SectionCard
              title="Skills"
              isExpanded={expandedSections.has('skills')}
              onToggle={() => toggleSection('skills')}
              onCopyAll={() => {
                if (!parsedResumeData) return;
                const lines: string[] = [];
                if (parsedResumeData.skills?.length) {
                  lines.push(`Skills: ${parsedResumeData.skills.join(', ')}`);
                }
                if (parsedResumeData.tools?.length) {
                  lines.push(`Tools: ${parsedResumeData.tools.join(', ')}`);
                }
                copyToClipboard(lines.join('\n'), 'skills-all');
              }}
              showCopyAll={
                expandedSections.has('skills') &&
                (!!parsedResumeData?.skills?.length || !!parsedResumeData?.tools?.length)
              }
            >
              {parsedResumeData?.skills && parsedResumeData.skills.length > 0 && (
                <CopyableLine
                  label="Skills"
                  value={parsedResumeData.skills.join(', ')}
                  itemId="skills"
                  isCopied={copiedItems.has('skills')}
                  onCopy={copyToClipboard}
                />
              )}
              {parsedResumeData?.tools && parsedResumeData.tools.length > 0 && (
                <CopyableLine
                  label="Tools"
                  value={parsedResumeData.tools.join(', ')}
                  itemId="tools"
                  isCopied={copiedItems.has('tools')}
                  onCopy={copyToClipboard}
                />
              )}
              {!parsedResumeData?.skills?.length &&
                !parsedResumeData?.tools?.length &&
                parsedResumeData && (
                  <span className={styles.emptyStateText}>No skills data available</span>
                )}
            </SectionCard>

            {/* Certifications Section */}
            {parsedResumeData?.certifications && parsedResumeData.certifications.length > 0 && (
              <SectionCard
                title="Certifications"
                isExpanded={expandedSections.has('certifications')}
                onToggle={() => toggleSection('certifications')}
                onCopyAll={() => {
                  if (!parsedResumeData?.certifications?.length) return;
                  const lines: string[] = [];
                  parsedResumeData.certifications.forEach((cert, idx) => {
                    lines.push(`Certification ${idx + 1}: ${cert.name}`);
                    if (cert.issuer) lines.push(`  Issuer: ${cert.issuer}`);
                    if (cert.year) lines.push(`  Year: ${cert.year}`);
                    lines.push('');
                  });
                  copyToClipboard(lines.join('\n'), 'certifications-all');
                }}
                showCopyAll={
                  expandedSections.has('certifications') &&
                  !!parsedResumeData?.certifications?.length
                }
              >
                {parsedResumeData.certifications.map((cert, index) => (
                  <div
                    key={`cert-${index}`}
                    className={`${styles.copyableLine} ${copiedItems.has(`certification-${index}`) ? styles.copied : ''}`}
                    onClick={() => {
                      const text = [cert.name, cert.issuer, cert.year].filter(Boolean).join('\n');
                      copyToClipboard(text, `certification-${index}`);
                    }}
                  >
                    <span className={styles.copyableLineLabel}>Certification {index + 1}</span>
                    <span className={styles.copyableLineValue}>{cert.name}</span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Projects Section */}
            {parsedResumeData?.projects && parsedResumeData.projects.length > 0 && (
              <SectionCard
                title="Projects"
                isExpanded={expandedSections.has('projects')}
                onToggle={() => toggleSection('projects')}
                onCopyAll={() => {
                  if (!parsedResumeData?.projects?.length) return;
                  const lines: string[] = [];
                  parsedResumeData.projects.forEach((proj, idx) => {
                    lines.push(`Project ${idx + 1}: ${proj.name}`);
                    if (proj.description) lines.push(`  Description: ${proj.description}`);
                    if (proj.technologies?.length)
                      lines.push(`  Technologies: ${proj.technologies.join(', ')}`);
                    if (proj.url) lines.push(`  URL: ${proj.url}`);
                    lines.push('');
                  });
                  copyToClipboard(lines.join('\n'), 'projects-all');
                }}
                showCopyAll={
                  expandedSections.has('projects') && !!parsedResumeData?.projects?.length
                }
              >
                {parsedResumeData.projects.map((project, index) => (
                  <div
                    key={`project-${index}`}
                    className={`${styles.copyableLine} ${copiedItems.has(`project-${index}`) ? styles.copied : ''}`}
                    onClick={() => {
                      const text = [
                        project.name,
                        project.description,
                        project.technologies?.join(', '),
                        project.url,
                      ]
                        .filter(Boolean)
                        .join('\n');
                      copyToClipboard(text, `project-${index}`);
                    }}
                  >
                    <span className={styles.copyableLineLabel}>Project {index + 1}</span>
                    <span className={styles.copyableLineValue}>{project.name}</span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Extra Sections (Languages, etc.) */}
            {parsedResumeData?.extra && parsedResumeData.extra.length > 0 && (
              <SectionCard
                title="Additional Information"
                isExpanded={expandedSections.has('extra')}
                onToggle={() => toggleSection('extra')}
                onCopyAll={() => {
                  if (!parsedResumeData?.extra?.length) return;
                  const lines: string[] = [];
                  parsedResumeData.extra.forEach((section) => {
                    lines.push(`${section.section}: ${section.items.join(', ')}`);
                  });
                  copyToClipboard(lines.join('\n'), 'extra-all');
                }}
                showCopyAll={expandedSections.has('extra') && !!parsedResumeData?.extra?.length}
              >
                {parsedResumeData.extra.map((section, index) => (
                  <div
                    key={`extra-${index}`}
                    className={`${styles.copyableLine} ${copiedItems.has(`extra-${index}`) ? styles.copied : ''}`}
                    onClick={() => {
                      copyToClipboard(
                        `${section.section}: ${section.items.join(', ')}`,
                        `extra-${index}`
                      );
                    }}
                  >
                    <span className={styles.copyableLineLabel}>{section.section}</span>
                    <span className={styles.copyableLineValue}>{section.items.join(', ')}</span>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Section Card Component
interface SectionCardProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyAll?: () => void;
  showCopyAll?: boolean;
  children: React.ReactNode;
}

function SectionCard({ title, isExpanded, onToggle, children }: SectionCardProps) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionTitle}>{title}</span>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </div>
      {isExpanded && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

// Copyable Line Component
interface CopyableLineProps {
  label: string;
  value: string;
  itemId: string;
  isCopied: boolean;
  onCopy: (text: string, itemId: string) => void;
}

function CopyableLine({ label, value, itemId, isCopied, onCopy }: CopyableLineProps) {
  return (
    <div
      className={`${styles.copyableLine} ${isCopied ? styles.copied : ''}`}
      onClick={() => onCopy(value, itemId)}
    >
      <span className={styles.copyableLineLabel}>{label}</span>
      <span className={styles.copyableLineValue}>{value}</span>
    </div>
  );
}

// Experience Block Component - Each line/bullet individually copyable, parent copies all
interface ExperienceBlockProps {
  experience: {
    role: string | null;
    company?: string | null;
    duration?: string | null;
    location?: string | null;
    bullets: string[];
  };
  index: number;
  copiedItems: Set<string>;
  onCopy: (text: string, itemId: string) => void;
}

function ExperienceBlock({ experience, index, copiedItems, onCopy }: ExperienceBlockProps) {
  // Copy all experience data
  const handleCopyAll = () => {
    const lines: string[] = [];
    if (experience.role) lines.push(experience.role);
    if (experience.company) lines.push(experience.company);
    if (experience.duration) lines.push(experience.duration);
    if (experience.location) lines.push(experience.location);
    if (experience.bullets?.length) {
      lines.push(...experience.bullets);
    }
    onCopy(lines.filter(Boolean).join('\n'), `exp-${index}-all`);
  };

  // Stop propagation for individual line clicks
  const handleLineClick = (e: React.MouseEvent, text: string, itemId: string) => {
    e.stopPropagation();
    onCopy(text, itemId);
  };

  return (
    <div
      className={`${styles.experienceBlock} ${copiedItems.has(`exp-${index}-all`) ? styles.copied : ''}`}
      onClick={handleCopyAll}
    >
      {experience.role && (
        <div
          className={`${styles.experienceLine} ${copiedItems.has(`exp-${index}-role`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, experience.role || '', `exp-${index}-role`)}
        >
          <span className={styles.experienceLineLabel}>Role</span>
          <span className={styles.experienceLineValue}>{experience.role}</span>
        </div>
      )}
      {experience.company && (
        <div
          className={`${styles.experienceLine} ${copiedItems.has(`exp-${index}-company`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, experience.company || '', `exp-${index}-company`)}
        >
          <span className={styles.experienceLineLabel}>Company</span>
          <span className={styles.experienceLineValue}>{experience.company}</span>
        </div>
      )}
      {experience.duration && (
        <div
          className={`${styles.experienceLine} ${copiedItems.has(`exp-${index}-duration`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, experience.duration || '', `exp-${index}-duration`)}
        >
          <span className={styles.experienceLineLabel}>Duration</span>
          <span className={styles.experienceLineValue}>{experience.duration}</span>
        </div>
      )}
      {experience.location && (
        <div
          className={`${styles.experienceLine} ${copiedItems.has(`exp-${index}-location`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, experience.location || '', `exp-${index}-location`)}
        >
          <span className={styles.experienceLineLabel}>Location</span>
          <span className={styles.experienceLineValue}>{experience.location}</span>
        </div>
      )}
      {experience.bullets?.length > 0 && (
        <div
          className={`${styles.experienceLine} ${copiedItems.has(`exp-${index}-description`) ? styles.copied : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onCopy(experience.bullets?.join('\n') || '', `exp-${index}-description`);
          }}
        >
          <span className={styles.experienceLineLabel}>Description</span>
          <ul className={styles.experienceBullets}>
            {experience.bullets.map((bullet, bIndex) => (
              <li
                key={bIndex}
                className={`${styles.experienceBullet} ${copiedItems.has(`exp-${index}-bullet-${bIndex}`) ? styles.copied : ''}`}
                onClick={(e) => handleLineClick(e, bullet, `exp-${index}-bullet-${bIndex}`)}
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Education Block Component
interface EducationBlockProps {
  education: {
    degree: string | null;
    field?: string | null;
    institution: string | null;
    year?: string | null;
    gpa?: string | null;
  };
  index: number;
  copiedItems: Set<string>;
  onCopy: (text: string, itemId: string) => void;
}

function EducationBlock({ education, index, copiedItems, onCopy }: EducationBlockProps) {
  const isCopied = copiedItems.has(`education-${index}`);

  // Copy all education data
  const handleCopyAll = () => {
    const lines: string[] = [];
    if (education.degree) {
      lines.push(`${education.degree}${education.field ? ` in ${education.field}` : ''}`);
    }
    if (education.institution) lines.push(education.institution);
    if (education.year) lines.push(education.year);
    if (education.gpa) lines.push(`GPA: ${education.gpa}`);
    onCopy(lines.filter(Boolean).join('\n'), `education-${index}`);
  };

  // Stop propagation for individual line clicks
  const handleLineClick = (e: React.MouseEvent, text: string, itemId: string) => {
    e.stopPropagation();
    onCopy(text, itemId);
  };

  return (
    <div
      className={`${styles.educationBlock} ${isCopied ? styles.copied : ''}`}
      onClick={handleCopyAll}
    >
      <div
        className={`${styles.educationLine} ${copiedItems.has(`edu-${index}-degree`) ? styles.copied : ''}`}
        onClick={(e) =>
          handleLineClick(
            e,
            `${education.degree}${education.field ? ` in ${education.field}` : ''}`,
            `edu-${index}-degree`
          )
        }
      >
        <span className={styles.educationLineLabel}>Degree</span>
        <span className={styles.educationLineValue}>
          {education.degree}
          {education.field && ` in ${education.field}`}
        </span>
      </div>
      <div
        className={`${styles.educationLine} ${copiedItems.has(`edu-${index}-institution`) ? styles.copied : ''}`}
        onClick={(e) => handleLineClick(e, education.institution || '', `edu-${index}-institution`)}
      >
        <span className={styles.educationLineLabel}>Institution</span>
        <span className={styles.educationLineValue}>{education.institution}</span>
      </div>
      {education.year && (
        <div
          className={`${styles.educationLine} ${copiedItems.has(`edu-${index}-year`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, education.year || '', `edu-${index}-year`)}
        >
          <span className={styles.educationLineLabel}>Year</span>
          <span className={styles.educationLineValue}>{education.year}</span>
        </div>
      )}
      {education.gpa && (
        <div
          className={`${styles.educationLine} ${copiedItems.has(`edu-${index}-gpa`) ? styles.copied : ''}`}
          onClick={(e) => handleLineClick(e, `GPA: ${education.gpa}`, `edu-${index}-gpa`)}
        >
          <span className={styles.educationLineLabel}>GPA</span>
          <span className={styles.educationLineValue}>{education.gpa}</span>
        </div>
      )}
    </div>
  );
}
