import { createFileRoute, useNavigate, ErrorComponent } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  EnhancedTextField,
  EnhancedButton,
  EnhancedSelectDropdown,
  EnhancedChip,
  EnhancedTextInputArea,
  EnhancedAccordion,
} from '@repo/ui';
import { Box } from '@mui/material';
import type { Job, JobList, JobPublic } from '@repo/shared-types';
import styles from './style/job.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

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
  keySkills: string[];
  tags: string[];
}

const initialFormData: JobFormData = {
  companyName: '',
  title: '',
  location: '',
  minSalary: '',
  maxSalary: '',
  currency: 'IND',
  persona: 'default',
  acceptanceLevel: 0,
  jobType: 'Full-time',
  description: '',
  notes: '',
  status: 'draft',
  jobPostingUrl: '',
  keySkills: [],
  tags: [],
};

export interface JobSearch {
  jobId?: string;
}

type JobAddResponse =
  | {
      success: true;
      data: JobPublic;
    }
  | {
      success: false;
      error: string;
    };

type JobFetchList =
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      data: JobList;
    };

export const Route = createFileRoute('/job')({
  shouldReload: true,
  validateSearch: (search: Record<string, unknown>): JobSearch => {
    return {
      jobId: search.jobId as string | undefined,
    };
  },
  loaderDeps: ({ search: { jobId } }) => ({ jobId }),
  loader: async ({ deps: { jobId } }) => {
    if (!jobId || typeof chrome === 'undefined' || !chrome.runtime) {
      return { jobData: null, isEditing: !!jobId, error: null };
    }

    return new Promise<{ jobData: Job | null; isEditing: boolean; error: string | null }>(
      (resolve) => {
        chrome.runtime.sendMessage(
          { action: 'GET_JOBS', payload: { limit: 100 } },
          (res: JobFetchList) => {
            if (res?.success && res.data?.jobs) {
              const job = res.data.jobs.find((j: Job) => j.id === jobId);
              resolve({
                jobData: job || null,
                isEditing: true,
                error: job ? null : 'Job not found',
              });
            } else if (!res?.success) {
              resolve({
                jobData: null,
                isEditing: true,
                error: res?.error || 'Failed to fetch job',
              });
            }
          }
        );
      }
    );
  },
  component: JobComponent,
  pendingComponent: () => <div style={{ color: '#fff', padding: '1rem' }}>Loading job data...</div>,
  errorComponent: ErrorComponent,
});

function JobComponent() {
  const navigate = useNavigate();
  const { jobData, isEditing, error: loaderError } = Route.useLoaderData();

  const [formData, setFormData] = useState<JobFormData>(() => {
    if (jobData) {
      return {
        companyName: jobData.companyName || '',
        title: jobData.title || '',
        location: String(jobData.metaData?.location || ''),
        minSalary: String(jobData.metaData?.minSalary || ''),
        maxSalary: String(jobData.metaData?.maxSalary || ''),
        currency: String(jobData.metaData?.currency || 'IND'),
        persona: jobData.persona || 'default',
        acceptanceLevel: jobData.acceptanceLevel || 0,
        jobType: String(jobData.metaData?.jobType || 'Full-time'),
        description: String(jobData.description?.text || ''),
        notes: jobData.notes || '',
        status: jobData.status || 'draft',
        jobPostingUrl: String(jobData.metaData?.jobPostingUrl || ''),
        keySkills: jobData.keySkills || [],
        tags: jobData.tags || [],
      };
    }
    return initialFormData;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(loaderError);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});

  // Pre-fill jobPostingUrl from Quick Save button (content script)
  useEffect(() => {
    if (isEditing) return; // don't overwrite URL when editing an existing job
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    chrome.storage.local.get(['quickSaveUrl'], (result) => {
      const url = result.quickSaveUrl;
      if (url && typeof url === 'string') {
        setFormData((prev) => ({ ...prev, jobPostingUrl: url }));
        // Clear after reading so it doesn't persist to future form visits
        chrome.storage.local.remove('quickSaveUrl');
      }
    });
  }, [isEditing]);

  const validateField = (field: keyof JobFormData, value: string): string => {
    switch (field) {
      case 'companyName':
        return !value.trim() ? 'Company Name is required' : '';
      case 'title':
        return !value.trim() ? 'Position Title is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (field: keyof JobFormData) => (e: { target: { value: unknown } }) => {
    const value = String(e.target.value);
    setFormData((prev) => ({ ...prev, [field]: value }));
    const errorMsg = validateField(field, value);
    setFormErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const [tagInput, setTagInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const handleAddChip = (
    field: 'tags' | 'keySkills',
    value: string,
    setValue: (val: string) => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], trimmed],
    }));
    setValue('');
  };

  const handleDeleteChip = (field: 'tags' | 'keySkills', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    const newErrors: Partial<Record<keyof JobFormData, string>> = {};
    let hasError = false;
    (Object.keys(formData) as Array<keyof JobFormData>).forEach((key) => {
      const msg = validateField(key, String(formData[key]));
      if (msg) {
        newErrors[key] = msg;
        hasError = true;
      }
    });

    setFormErrors(newErrors);

    if (hasError) {
      setError('Please fix the errors before saving.');
      setLoading(false);
      return;
    }

    const payload = {
      ...(isEditing && jobData?.id ? { id: jobData.id } : {}),
      title: formData.title,
      companyName: formData.companyName,
      persona: formData.persona,
      status: formData.status as 'draft' | 'active' | 'archived',
      acceptanceLevel: Number(formData.acceptanceLevel) || 0,
      notes: formData.notes,
      keySkills: formData.keySkills,
      tags: formData.tags,
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
      try {
        const res = await new Promise<JobAddResponse>((resolve, reject) => {
          chrome.runtime.sendMessage({ action, payload }, (response: JobAddResponse) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });

        setLoading(false);
        if (res?.success) {
          navigate({ to: '/' });
        } else {
          setError(res?.error || 'An unexpected error occurred.');
        }
      } catch (err) {
        setLoading(false);
        const errorMessage =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message ||
              'Failed to communicate with background script';
        setError(errorMessage);
      }
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
        <div className={`${styles.scrollArea} ${scrollStyles.scrollbarVerticalContainer}`}>
          <EnhancedTextField
            label="Company"
            value={formData.companyName}
            onChange={handleChange('companyName')}
            placeholder="e.g. Amazon"
            disabled={loading}
            variant={formErrors.companyName ? 'error' : 'default'}
            helperText={formErrors.companyName || 'Enter the company name.'}
          />

          <EnhancedTextField
            label="Position Title"
            value={formData.title}
            onChange={handleChange('title')}
            placeholder="e.g. SDE II"
            disabled={loading}
            variant={formErrors.title ? 'error' : 'default'}
            helperText={formErrors.title || 'Enter the position title.'}
          />

          <EnhancedTextField
            label="Location"
            value={formData.location}
            onChange={handleChange('location')}
            placeholder="e.g. Bangalore, IN"
            disabled={loading}
            variant={formErrors.location ? 'error' : 'default'}
            helperText={formErrors.location}
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
                variant={formErrors.minSalary ? 'error' : 'default'}
                helperText={formErrors.minSalary}
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
                variant={formErrors.maxSalary ? 'error' : 'default'}
                helperText={formErrors.maxSalary}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <EnhancedTextField
                label="Currency"
                value={formData.currency}
                onChange={handleChange('currency')}
                placeholder="IND"
                disabled={loading}
                variant={formErrors.currency ? 'error' : 'default'}
                helperText={formErrors.currency}
              />
            </div>
            <div className={styles.field}>
              <EnhancedTextField
                label="Job Type"
                value={formData.jobType}
                onChange={handleChange('jobType')}
                placeholder="Full-time"
                disabled={loading}
                variant={formErrors.jobType ? 'error' : 'default'}
                helperText={formErrors.jobType}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <EnhancedSelectDropdown
                label="Persona"
                testId="persona-dropdown"
                value={formData.persona}
                onChange={handleChange('persona') as never}
                disabled={loading}
                error={!!formErrors.persona}
                showErrorMsg={!!formErrors.persona}
                errorText={formErrors.persona}
                options={[
                  { value: 'default', label: 'Default', dataId: 'default' },
                  {
                    value: 'software-engineer',
                    label: 'Software Engineer',
                    dataId: 'software-engineer',
                  },
                  { value: 'product-manager', label: 'Product Manager', dataId: 'product-manager' },
                ]}
              />
            </div>
            <div className={styles.field}>
              <EnhancedTextField
                label="Acceptance Level"
                value={String(formData.acceptanceLevel)}
                onChange={handleChange('acceptanceLevel')}
                type="number"
                disabled={loading}
                variant={formErrors.acceptanceLevel ? 'error' : 'default'}
                helperText={formErrors.acceptanceLevel}
                customProps={{
                  childProps: {
                    slotProps: { htmlInput: { min: 0, max: 100 } },
                  },
                }}
              />
            </div>
          </div>

          <EnhancedAccordion title="Job Description">
            <EnhancedTextInputArea
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Paste job description here..."
              disabled={loading}
              variant={formErrors.description ? 'error' : 'default'}
              helperText={formErrors.description}
            />
          </EnhancedAccordion>

          <EnhancedAccordion title="Notes (Markdown supported)">
            <EnhancedTextInputArea
              value={formData.notes}
              onChange={handleChange('notes')}
              placeholder="Add your personal notes or markdown content here..."
              disabled={loading}
              variant={formErrors.notes ? 'error' : 'default'}
              helperText={formErrors.notes}
            />
          </EnhancedAccordion>

          <EnhancedSelectDropdown
            label="Application Status"
            testId="status-dropdown"
            value={formData.status}
            onChange={handleChange('status') as never}
            disabled={loading}
            error={!!formErrors.status}
            showErrorMsg={!!formErrors.status}
            errorText={formErrors.status}
            options={[
              { value: 'draft', label: 'Draft (Not yet applied)', dataId: 'draft' },
              { value: 'active', label: 'Active (Applied/Interviewing)', dataId: 'active' },
              { value: 'archived', label: 'Archived (Rejected/Offer)', dataId: 'archived' },
            ]}
          />

          <EnhancedTextField
            label="Job Posting URL"
            value={formData.jobPostingUrl}
            onChange={handleChange('jobPostingUrl')}
            placeholder="https://..."
            type="url"
            disabled={loading}
            variant={formErrors.jobPostingUrl ? 'error' : 'default'}
            helperText={formErrors.jobPostingUrl}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className={styles.row} style={{ alignItems: 'flex-start' }}>
              <div className={styles.field}>
                <EnhancedTextField
                  label="Key Skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChip('keySkills', skillInput, setSkillInput);
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  disabled={loading}
                  variant={formErrors.keySkills ? 'error' : 'default'}
                  helperText={formErrors.keySkills || 'Press Enter to add'}
                />
              </div>
              <div className={styles.addButtonContainer}>
                <EnhancedButton
                  label="Add"
                  colorTheme="secondary"
                  onClick={() => handleAddChip('keySkills', skillInput, setSkillInput)}
                  disabled={loading || !skillInput.trim()}
                />
              </div>
            </div>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.keySkills.map((skill, index) => (
                <EnhancedChip
                  id={`skill-chip-${index}`}
                  key={index}
                  testId={`skill-chip-${index}`}
                  label={skill}
                  showDeleteIcon={true}
                  onDelete={() => handleDeleteChip('keySkills', index)}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className={styles.row} style={{ alignItems: 'flex-start' }}>
              <div className={styles.field}>
                <EnhancedTextField
                  label="Tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChip('tags', tagInput, setTagInput);
                    }
                  }}
                  placeholder="remote, faang (Press Enter to add)"
                  disabled={loading}
                  variant={formErrors.tags ? 'error' : 'default'}
                  helperText={formErrors.tags || 'Press Enter to add'}
                />
              </div>
              <div className={styles.addButtonContainer}>
                <EnhancedButton
                  label="Add"
                  colorTheme="secondary"
                  onClick={() => handleAddChip('tags', tagInput, setTagInput)}
                  disabled={loading || !tagInput.trim()}
                />
              </div>
            </div>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.tags.map((tag, index) => (
                <EnhancedChip
                  id={`tag-chip-${index}`}
                  key={index}
                  testId={`tag-chip-${index}`}
                  label={tag}
                  showDeleteIcon={true}
                  onDelete={() => handleDeleteChip('tags', index)}
                />
              ))}
            </Box>
          </Box>
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
