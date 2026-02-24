import { createFileRoute, useNavigate } from '@tanstack/react-router';
// @ts-ignore
import { useState, useEffect } from 'react';
import { EnhancedTextField, EnhancedButton, EnhancedFieldLabel } from '@repo/ui';
import { Accordion, AccordionSummary, AccordionDetails, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// @ts-ignore
import type { Job, JobPublic } from '@repo/shared-types';
import styles from './style/job.module.css';
// @ts-ignore
import scrollStyles from '../../../packages/ui/src/scroll-bar.module.css';

interface JobFormData {
  companyName: string;
  title: string;
  location: string;
  minSalary: string;
  maxSalary: string;
  currency: string;
  persona: string;
  acceptanceLevel: number;
  jobType: string;
  description: string;
  notes: string;
  status: string;
  jobPostingUrl: string;
  keySkills: string;
  tags: string;
}

const initialFormData: JobFormData = {
  companyName: '',
  title: '',
  location: '',
  minSalary: '',
  maxSalary: '',
  currency: 'USD',
  persona: 'default',
  acceptanceLevel: 0,
  jobType: 'Full-time',
  description: '',
  notes: '',
  status: 'draft',
  jobPostingUrl: '',
  keySkills: '',
  tags: '',
};

export const Route = createFileRoute('/job' as any)({
  component: JobComponent,
});

function JobComponent() {
  const navigate = useNavigate();
  // @ts-ignore
  const search: { jobId?: string } = Route.useSearch();
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!search.jobId;

  useEffect(() => {
    if (isEditing && typeof chrome !== 'undefined' && chrome.runtime) {
      setLoading(true);
      // Fetch existing job logic would go here via GET_JOBS + filter by ID
      // Simulating a fetch failure/empty implementation for now since GET_JOBS returns list
      // In a real scenario we might need a GET_JOB_BY_ID action, but for now we'll just show empty form
      // or we can just fetch the list and find the job.
      chrome.runtime.sendMessage({ action: 'GET_JOBS', payload: { limit: 100 } }, (res: any) => {
        setLoading(false);
        if (res?.success && res.data?.jobs) {
          const job = res.data.jobs.find((j: Job) => j.id === search.jobId);
          if (job) {
            setFormData({
              companyName: job.companyName || '',
              title: job.title || '',
              location: String(job.metaData?.location || ''),
              minSalary: String(job.metaData?.minSalary || ''),
              maxSalary: String(job.metaData?.maxSalary || ''),
              currency: String(job.metaData?.currency || 'USD'),
              persona: job.persona || 'default',
              acceptanceLevel: job.acceptanceLevel || 0,
              jobType: String(job.metaData?.jobType || 'Full-time'),
              description: String(job.description?.text || ''),
              notes: job.notes || '',
              status: job.status || 'draft',
              jobPostingUrl: String(job.metaData?.jobPostingUrl || ''),
              keySkills: job.keySkills?.join(', ') || '',
              tags: job.tags?.join(', ') || '',
            });
          }
        }
      });
    }
  }, [isEditing, search.jobId]);

  const handleChange = (field: keyof JobFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    setError(null);
    setLoading(true);

    if (!formData.title || !formData.companyName) {
      setError('Company Name and Position Title are required');
      setLoading(false);
      return;
    }

    const payload = {
      ...(isEditing ? { id: search.jobId } : {}),
      title: formData.title,
      companyName: formData.companyName,
      persona: formData.persona,
      status: formData.status as 'draft' | 'active' | 'archived',
      acceptanceLevel: Number(formData.acceptanceLevel) || 0,
      notes: formData.notes,
      keySkills: formData.keySkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: formData.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      metaData: {
        location: formData.location,
        minSalary: formData.minSalary,
        maxSalary: formData.maxSalary,
        currency: formData.currency,
        jobType: formData.jobType,
        jobPostingUrl: formData.jobPostingUrl,
      },
      description: {
        text: formData.description,
      },
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const action = isEditing ? 'UPDATE_JOB' : 'CREATE_JOB';
      chrome.runtime.sendMessage({ action, payload }, (response: any) => {
        setLoading(false);
        if (response?.success) {
          navigate({ to: '/' });
        } else {
          setError(response?.error || 'Failed to save job');
        }
      });
    } else {
      setLoading(false);
      setError('Chrome runtime not available');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isEditing ? 'Edit Job' : 'Add New Job'}</h1>
      </div>

      <div className={styles.formContainer}>
        <div className={`${styles.scrollArea} ${scrollStyles.scrollContainer}`}>
          <EnhancedTextField
            label="Company"
            value={formData.companyName}
            onChange={handleChange('companyName')}
            placeholder="e.g. Amazon"
            disabled={loading}
          />

          <EnhancedTextField
            label="Position Title"
            value={formData.title}
            onChange={handleChange('title')}
            placeholder="e.g. Software Development Engineer II"
            disabled={loading}
          />

          <EnhancedTextField
            label="Location"
            value={formData.location}
            onChange={handleChange('location')}
            placeholder="e.g. Bangalore, IN"
            disabled={loading}
          />

          <div className={styles.row}>
            <div className={styles.field}>
              <EnhancedTextField
                label="Min Salary"
                value={formData.minSalary}
                onChange={handleChange('minSalary')}
                placeholder="0"
                type="number"
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <EnhancedTextField
                label="Max Salary"
                value={formData.maxSalary}
                onChange={handleChange('maxSalary')}
                placeholder="0"
                type="number"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <EnhancedTextField
                label="Currency"
                value={formData.currency}
                onChange={handleChange('currency')}
                placeholder="USD"
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <EnhancedTextField
                label="Job Type"
                value={formData.jobType}
                onChange={handleChange('jobType')}
                placeholder="Full-time"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <EnhancedTextField
                label="Persona"
                value={formData.persona}
                onChange={handleChange('persona')}
                customProps={{
                  props: { select: true },
                }}
                disabled={loading}
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="software-engineer">Software Engineer</MenuItem>
                <MenuItem value="product-manager">Product Manager</MenuItem>
              </EnhancedTextField>
            </div>
            <div className={styles.field}>
              <EnhancedTextField
                label="Acceptance Level (0-100)"
                value={String(formData.acceptanceLevel)}
                onChange={handleChange('acceptanceLevel')}
                type="number"
                disabled={loading}
                customProps={{
                  childProps: {
                    slotProps: { htmlInput: { min: 0, max: 100 } },
                  },
                }}
              />
            </div>
          </div>

          <Accordion className={styles.accordionContainer} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}
              className={styles.accordionSummary}
            >
              <span className={styles.accordionTitle}>Job Description</span>
            </AccordionSummary>
            <AccordionDetails className={styles.accordionDetails}>
              <EnhancedTextField
                customProps={{
                  props: { multiline: true, rows: 6 },
                }}
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="Paste job description here..."
                disabled={loading}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion className={styles.accordionContainer} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}
              className={styles.accordionSummary}
            >
              <span className={styles.accordionTitle}>Notes (Markdown supported)</span>
            </AccordionSummary>
            <AccordionDetails className={styles.accordionDetails}>
              <EnhancedTextField
                customProps={{
                  props: { multiline: true, rows: 4 },
                }}
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Add your personal notes or markdown content here..."
                disabled={loading}
              />
            </AccordionDetails>
          </Accordion>

          <EnhancedTextField
            label="Application Status"
            value={formData.status}
            onChange={handleChange('status')}
            customProps={{
              props: { select: true },
            }}
            disabled={loading}
          >
            <MenuItem value="draft">Draft (Not yet applied)</MenuItem>
            <MenuItem value="active">Active (Applied/Interviewing)</MenuItem>
            <MenuItem value="archived">Archived (Rejected/Offer)</MenuItem>
          </EnhancedTextField>

          <EnhancedTextField
            label="Job Posting URL"
            value={formData.jobPostingUrl}
            onChange={handleChange('jobPostingUrl')}
            placeholder="https://..."
            type="url"
            disabled={loading}
          />

          <EnhancedTextField
            label="Key Skills (comma separated)"
            value={formData.keySkills}
            onChange={handleChange('keySkills')}
            placeholder="React, Node.js, Typescript"
            disabled={loading}
          />

          <EnhancedTextField
            label="Tags (comma separated)"
            value={formData.tags}
            onChange={handleChange('tags')}
            placeholder="remote, faang, high-priority"
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{ padding: '0 1.5rem', marginTop: '-0.5rem' }}>
            <div className={styles.error}>{error}</div>
          </div>
        )}

        <div className={styles.buttonGroup}>
          <EnhancedButton
            label="Cancel"
            colorTheme="secondary"
            onClick={() => navigate({ to: '/' })}
            disabled={loading}
          />
          <EnhancedButton
            label={isEditing ? 'Update Job' : 'Save Job'}
            colorTheme="primary"
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
