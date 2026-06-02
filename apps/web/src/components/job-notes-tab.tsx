import { lazy, Suspense, useState, useCallback } from 'react';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import EditIcon from '@mui/icons-material/Edit';
import { EnhancedButton, EnhancedTextInputArea } from '@repo/ui';
import type { Job, UpdateJobInput } from '@repo/shared-types';
import { useUpdateJob } from '../hooks/use-jobs';
import { useStore } from '../store';
import styles from './style/job-notes-tab.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
const ReactMarkdown = lazy(() => import('react-markdown'));

const customSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'dl',
    'dt',
    'dd',
    'em',
    'strong',
    'sub',
    'sup',
    'mark',
    'del',
    'ins',
  ],
  attributes: {
    ...defaultSchema.attributes,
    table: ['className'],
    thead: ['className'],
    tbody: ['className'],
    tr: ['className'],
    th: ['className', 'align', 'scope', 'colSpan', 'rowSpan'],
    td: ['className', 'align', 'colSpan', 'rowSpan'],
    dl: ['className'],
    dt: ['className'],
    dd: ['className'],
  },
};

interface JobNotesTabProps {
  job: Job;
  onJobUpdate?: (updatedJob: Job) => void;
}

// Custom components for markdown styling
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.mdH4}>{children}</h4>,
  h5: ({ children }) => <h5 className={styles.mdH5}>{children}</h5>,
  h6: ({ children }) => <h6 className={styles.mdH6}>{children}</h6>,
  p: ({ children }) => <p className={styles.mdParagraph}>{children}</p>,
  ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
  li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
  blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
  code: ({ className, children }) => {
    const isInline = !className;
    return isInline ? (
      <code className={styles.mdInlineCode}>{children}</code>
    ) : (
      <code className={styles.mdCodeBlock}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre
      className={`${styles.mdPre} ${scrollStyles.scrollbarVerticalThinContainer} ${scrollStyles.scrollbarHorizontalThinContainer}`}
    >
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a href={href} className={styles.mdLink} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className={styles.mdTableWrapper}>
      <table className={styles.mdTable}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={styles.mdThead}>{children}</thead>,
  tbody: ({ children }) => <tbody className={styles.mdTbody}>{children}</tbody>,
  tr: ({ children }) => <tr className={styles.mdTr}>{children}</tr>,
  th: ({ children }) => <th className={styles.mdTh}>{children}</th>,
  td: ({ children }) => <td className={styles.mdTd}>{children}</td>,
  dl: ({ children }) => <dl className={styles.mdDl}>{children}</dl>,
  dt: ({ children }) => <dt className={styles.mdDt}>{children}</dt>,
  dd: ({ children }) => <dd className={styles.mdDd}>{children}</dd>,
  em: ({ children }) => <em className={styles.mdEm}>{children}</em>,
  strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
  hr: () => <hr className={styles.mdHr} />,
};

// Loading component for Suspense fallback
function MarkdownLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>Loading markdown...</div>
    </div>
  );
}

export function JobNotesTab({ job, onJobUpdate }: JobNotesTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(job.notes || '');
  const updateJob = useUpdateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

  const handleEditClick = () => {
    setNotes(job.notes || '');
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setNotes(job.notes || '');
  };

  const handleSaveClick = useCallback(async () => {
    const payload: UpdateJobInput = {
      id: job.id,
      notes: notes || undefined,
    };

    updateJob.mutate(payload, {
      onSuccess: (updatedJob) => {
        showSnackbar('Notes saved successfully!', { severity: 'success' });
        setIsEditing(false);
        if (onJobUpdate && updatedJob) {
          onJobUpdate(updatedJob);
        }
      },
      onError: (error) => {
        showSnackbar(error instanceof Error ? error.message : 'Failed to save notes', {
          severity: 'error',
        });
      },
    });
  }, [notes, job.id, updateJob, showSnackbar, onJobUpdate]);

  const handleChange = (e: { target: { value: unknown } }) => {
    const value = String(e.target.value);
    setNotes(value);
  };

  const isLoading = updateJob.isPending;

  // View Mode
  if (!isEditing) {
    return (
      <div className={styles.container}>
        <div className={`${styles.viewContainer} ${scrollStyles.scrollbarVerticalContainer}`}>
          {job.notes && job.notes.trim() ? (
            <Suspense fallback={<MarkdownLoading />}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                components={markdownComponents}
              >
                {job.notes}
              </ReactMarkdown>
            </Suspense>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No notes yet</p>
              <p className={styles.emptyStateSubtext}>
                Add notes to keep track of important information about this job
              </p>
            </div>
          )}

          {/* Edit Button */}
          <div className={styles.buttonGroupContainer}>
            <EnhancedButton
              label="Edit"
              colorTheme="secondary"
              onClick={handleEditClick}
              startIcon={<EditIcon sx={{ fontSize: '1rem' }} />}
            />
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className={`${styles.container} ${scrollStyles.scrollbarVerticalContainer}`}>
      <div className={styles.editContainer}>
        <EnhancedTextInputArea
          label="Notes"
          value={notes}
          onChange={handleChange}
          placeholder="Write your notes here... Supports Markdown formatting

Examples:
- **Bold text** and *italic text*
- # Headers
- [Links](https://example.com)
- Lists (ordered and unordered)
- `inline code` and code blocks
- Tables (using | syntax)"
          minRows={12}
          maxRows={20}
          disabled={isLoading}
          customProps={{
            childProps: {
              textfieldBox: {
                sx: { flex: 1, width: '100%' },
              },
            },
          }}
        />

        {/* Action Buttons */}
        <div className={styles.buttonGroupContainer}>
          <EnhancedButton
            label="Cancel"
            colorTheme="secondary"
            onClick={handleCancelClick}
            disabled={isLoading}
          />
          <EnhancedButton
            label="Save"
            colorTheme="primary"
            onClick={handleSaveClick}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default JobNotesTab;
