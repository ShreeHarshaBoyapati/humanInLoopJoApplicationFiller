import { useState, useEffect, useRef, useCallback } from 'react';
import {
  EnhancedTextField,
  EnhancedButton,
  EnhancedSelectDropdown,
  EnhancedChip,
  EnhancedTextInputArea,
  EnhancedAccordion,
} from '@repo/ui';
import { Box } from '@mui/material';
import type { Job, ScrapedJob } from '@repo/shared-types';
import styles from '../routes/style/job.module.css';

interface JobFormData {
  companyName: string;
  title: string;
  location: string;
  salary: string;
  requirements: string;
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
  salary: '',
  requirements: '',
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

export interface Step1JobDetailsProps {
  jobData?: Job | null;
  isEditing?: boolean;
  onSaveSuccess?: (jobId: string) => void;
  onError?: (error: string) => void;
}

export type Step1SubmitHandler = {
  submit: () => Promise<{ success: boolean; jobId?: string; error?: string }>;
  validate: () => boolean;
};

export const Step1JobDetails = ({
  jobData,
  isEditing = false,
  onSaveSuccess,
  onError,
}: Step1JobDetailsProps) => {
  const [formData, setFormData] = useState<JobFormData>(() => {
    if (jobData) {
      return {
        companyName: jobData.companyName || '',
        title: jobData.title || '',
        location: String(jobData.metaData?.location || ''),
        salary: String(jobData.metaData?.salary || ''),
        requirements: String(jobData.requirements),
        currency: String(jobData.metaData?.currency || 'IND'),
        persona: jobData.personaId || '',
        acceptanceLevel: jobData.acceptanceLevel || 0,
        jobType: String(jobData.metaData?.jobType || 'Full-time'),
        description: String(jobData.description || ''),
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
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const originalFormDataRef = useRef<JobFormData>(formData);

  const getIsDirty = useCallback(
    (current: JobFormData) =>
      JSON.stringify(current) !== JSON.stringify(originalFormDataRef.current),
    []
  );

  const getIsBlank = useCallback(
    (current: JobFormData) => JSON.stringify(current) === JSON.stringify(initialFormData),
    []
  );

  // Ref to track the last processed quick save
  const lastProcessedScrapeRef = useRef<string | null>(null);

  // Pre-fill form from Quick Save
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    const handleQuickSaveData = () => {
      chrome.storage.local.get(['scrapedJobData'], (result) => {
        const scraped = result.scrapedJobData as ScrapedJob;
        if (!scraped || typeof scraped !== 'object') return;

        const scrapeHash = JSON.stringify(scraped);
        if (lastProcessedScrapeRef.current === scrapeHash) {
          return;
        }

        lastProcessedScrapeRef.current = scrapeHash;
        chrome.storage.local.remove(['scrapedJobData', 'quickSaveActive']);

        setFormData((current) => {
          const blank = getIsBlank(current);
          const dirty = getIsDirty(current);

          if (blank) {
            setError(null);
            return {
              ...current,
              companyName: scraped.companyName || current.companyName,
              title: scraped.title || current.title,
              location: scraped.location || current.location,
              description: scraped.description || current.description,
              keySkills:
                Array.isArray(scraped.keySkills) && scraped.keySkills.length
                  ? scraped.keySkills
                  : current.keySkills,
              tags:
                Array.isArray(scraped.tags) && scraped.tags.length ? scraped.tags : current.tags,
              jobType: scraped.jobType || current.jobType,
              jobPostingUrl: scraped.jobPostingUrl || current.jobPostingUrl,
              requirements: scraped.requirements || current.requirements,
              salary: scraped.salary || current.salary,
            };
          }

          if (!isEditing && dirty) {
            setError(
              'Quick Save arrived but you have unsaved changes. Save or discard them first, then click Quick Save again.'
            );
            return current;
          }

          if (isEditing && !dirty) {
            setError(null);
            return {
              ...initialFormData,
              companyName: scraped.companyName || '',
              title: scraped.title || '',
              location: scraped.location || '',
              description: scraped.description || '',
              keySkills: Array.isArray(scraped.keySkills) ? scraped.keySkills : [],
              tags: Array.isArray(scraped.tags) ? scraped.tags : [],
              jobType: scraped.jobType || 'Full-time',
              jobPostingUrl: scraped.jobPostingUrl || '',
              requirements: scraped.requirements || '',
              salary: scraped.salary || '',
            };
          }

          setError(
            'Quick Save arrived but you have unsaved changes to the current job. Save or discard them first, then click Quick Save again.'
          );
          return current;
        });
      });
    };

    handleQuickSaveData();

    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.scrapedJobData && changes.scrapedJobData.newValue) {
        handleQuickSaveData();
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [isEditing, getIsBlank, getIsDirty]);

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

  const validate = (): boolean => {
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
      return false;
    }
    return true;
  };

  const submit = async (): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    if (!validate()) {
      return { success: false, error: 'Validation failed' };
    }

    if (isEditing && !hasChanges()) {
      return { success: true, jobId: jobData?.id };
    }

    setError(null);
    setLoading(true);

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
        salary: formData.salary,
        currency: formData.currency,
        jobType: formData.jobType,
        jobPostingUrl: formData.jobPostingUrl,
      },
      description: formData.description,
      requirements: formData.requirements,
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const action = isEditing ? 'UPDATE_JOB' : 'CREATE_JOB';
      try {
        const res = await new Promise<{
          success: boolean;
          data?: { id?: string };
          error?: string;
        }>((resolve, reject) => {
          chrome.runtime.sendMessage({ action, payload }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });

        setLoading(false);

        if (res?.success && res.data?.id) {
          originalFormDataRef.current = formData;
          onSaveSuccess?.(res.data.id);
          return { success: true, jobId: res.data.id };
        } else {
          const errorMsg = res?.error || 'An unexpected error occurred.';
          setError(errorMsg);
          onError?.(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        setLoading(false);
        const errorMessage =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message ||
              'Failed to communicate with background script';
        setError(errorMessage);
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }
    } else {
      setLoading(false);
      const errorMsg = 'Chrome runtime not available';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Check if form has changes compared to original/initial state
  const hasChanges = (): boolean => {
    return getIsDirty(formData);
  };

  return {
    formData,
    setFormData,
    loading,
    error,
    formErrors,
    validate,
    submit,
    hasChanges,
    renderForm: () => (
      <>
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
          <div className={styles.field2}>
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
          <div className={styles.field3}>
            <EnhancedTextField
              label="Salary"
              value={formData.salary}
              onChange={handleChange('salary')}
              disabled={loading}
              variant={formErrors.salary ? 'error' : 'default'}
              helperText={formErrors.salary}
            />
          </div>
        </div>

        <div className={styles.row}>
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

        <EnhancedAccordion title="Requirements">
          <EnhancedTextInputArea
            value={formData.requirements}
            onChange={handleChange('requirements')}
            placeholder="Paste job requirements here..."
            disabled={loading}
            variant={formErrors.requirements ? 'error' : 'default'}
            helperText={formErrors.requirements}
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
      </>
    ),
  };
};

export default Step1JobDetails;
