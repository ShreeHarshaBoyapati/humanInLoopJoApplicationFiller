import { useState, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {
  EnhancedTextField,
  EnhancedButton,
  EnhancedSelectDropdown,
  EnhancedChip,
  EnhancedTextInputArea,
  EnhancedAccordion,
} from '@repo/ui';
import type { Job, UpdateJobInput } from '@repo/shared-types';
import { useUpdateJob, getStatusTransitionMessage } from '../hooks/use-jobs';
import { useStore } from '../store';
import styles from './style/job-overview-tab.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

interface JobOverviewTabProps {
  job: Job;
  onJobUpdate?: (updatedJob: Job) => void;
}

interface JobEditFormData {
  companyName: string;
  title: string;
  location: string;
  salary: string;
  currency: string;
  jobType: string;
  status: string;
  description: string;
  requirements: string;
  jobPostingUrl: string;
  keySkills: string[];
  tags: string[];
}

const getInitialFormData = (job: Job): JobEditFormData => ({
  companyName: job.companyName || '',
  title: job.title || '',
  location: String(job.metaData?.location || ''),
  salary: String(job.metaData?.salary || ''),
  currency: String(job.metaData?.currency || 'IND'),
  jobType: String(job.metaData?.jobType || 'Full-time'),
  status: job.status || 'draft',
  description: job.description || '',
  requirements: job.requirements || '',
  jobPostingUrl: String(job.metaData?.jobPostingUrl || ''),
  keySkills: job.keySkills || [],
  tags: job.tags || [],
});

export function JobOverviewTab({ job, onJobUpdate }: JobOverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<JobEditFormData>(getInitialFormData(job));
  const [skillInput, setSkillInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const originalFormDataRef = useRef<JobEditFormData>(getInitialFormData(job));

  const updateJob = useUpdateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

  const handleChange = (field: keyof JobEditFormData) => (e: { target: { value: unknown } }) => {
    const value = String(e.target.value);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleEditClick = () => {
    const initial = getInitialFormData(job);
    setFormData(initial);
    originalFormDataRef.current = initial;
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setSkillInput('');
    setTagInput('');
  };

  const hasArrayChanged = (current: string[], original: string[]): boolean => {
    if (current.length !== original.length) return true;
    return current.some((value, index) => value !== original[index]);
  };

  const handleSaveClick = useCallback(async () => {
    const original = originalFormDataRef.current;
    const payload: UpdateJobInput = { id: job.id };

    if (formData.title !== original.title) payload.title = formData.title;
    if (formData.companyName !== original.companyName) payload.companyName = formData.companyName;
    if (formData.status !== original.status) {
      payload.status = formData.status;
      payload.previousStatus = job.status;
    }
    if (formData.description !== original.description) payload.description = formData.description;
    if (formData.requirements !== original.requirements)
      payload.requirements = formData.requirements;
    if (hasArrayChanged(formData.keySkills, original.keySkills))
      payload.keySkills = formData.keySkills;
    if (hasArrayChanged(formData.tags, original.tags)) payload.tags = formData.tags;

    const metaDataChanged =
      formData.location !== original.location ||
      formData.salary !== original.salary ||
      formData.currency !== original.currency ||
      formData.jobType !== original.jobType ||
      formData.jobPostingUrl !== original.jobPostingUrl;

    if (metaDataChanged) {
      payload.metaData = {
        location: formData.location,
        salary: formData.salary,
        currency: formData.currency,
        jobType: formData.jobType,
        jobPostingUrl: formData.jobPostingUrl,
      };
    }

    updateJob.mutate(payload, {
      onSuccess: (updatedJob) => {
        const transitionMessage = getStatusTransitionMessage(job.status, formData.status);
        if (transitionMessage) {
          showSnackbar(transitionMessage, { severity: 'info' });
        } else {
          showSnackbar('Job updated successfully!', { severity: 'success' });
        }
        setIsEditing(false);
        setSkillInput('');
        setTagInput('');
        if (onJobUpdate && updatedJob) {
          onJobUpdate(updatedJob);
        }
      },
      onError: (error) => {
        showSnackbar(error instanceof Error ? error.message : 'Failed to update job', {
          severity: 'error',
        });
      },
    });
  }, [formData, job.id, job.status, updateJob, showSnackbar, onJobUpdate]);

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      applied: 'Applied',
      interview: 'Interview',
      offer: 'Offer',
      rejected: 'Rejected',
    };
    return statusMap[status] || status;
  };

  const isLoading = updateJob.isPending;

  // View Mode
  if (!isEditing) {
    return (
      <div className={styles.container}>
        <div className={`${styles.viewContainer} ${scrollStyles.scrollbarVerticalContainer}`}>
          {/* Location */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Location</label>
            <div className={styles.fieldValue}>
              {String(job.metaData?.location || '') || (
                <span className={styles.emptyState}>Not specified</span>
              )}
            </div>
          </div>

          {/* Currency & Salary */}
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Currency</label>
              <div className={styles.fieldValue}>
                {String(job.metaData?.currency || '') || (
                  <span className={styles.emptyState}>Not specified</span>
                )}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Salary</label>
              <div className={styles.fieldValue}>
                {String(job.metaData?.salary || '') || (
                  <span className={styles.emptyState}>Not specified</span>
                )}
              </div>
            </div>
          </div>

          {/* Job Type */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Job Type</label>
            <div className={styles.fieldValue}>
              {String(job.metaData?.jobType || '') || (
                <span className={styles.emptyState}>Not specified</span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Status</label>
            <div className={styles.fieldValue}>
              <span className={styles.statusBadge}>{getStatusLabel(job.status)}</span>
            </div>
          </div>

          {/* Job Posting URL */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Job Posting URL</label>
            <div className={styles.fieldValue}>
              {job.metaData?.jobPostingUrl ? (
                <a
                  href={String(job.metaData.jobPostingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkValue}
                >
                  {String(job.metaData.jobPostingUrl)}
                </a>
              ) : (
                <span className={styles.emptyState}>No URL provided</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Description</label>
            <div className={styles.textContent}>
              {job.description ? (
                <div>{job.description}</div>
              ) : (
                <span className={styles.emptyState}>No description available</span>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Requirements</label>
            <div className={styles.textContent}>
              {job.requirements ? (
                <div>{job.requirements}</div>
              ) : (
                <span className={styles.emptyState}>No requirements available</span>
              )}
            </div>
          </div>

          {/* Key Skills */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Key Skills</label>
            <div className={styles.chipsContainer}>
              {job.keySkills && job.keySkills.length > 0 ? (
                job.keySkills.map((skill, index) => (
                  <EnhancedChip
                    id={`skill-chip-${index}`}
                    key={index}
                    testId={`skill-chip-${index}`}
                    label={skill}
                    showDeleteIcon={false}
                  />
                ))
              ) : (
                <span className={styles.emptyState}>No key skills listed</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Tags</label>
            <div className={styles.chipsContainer}>
              {job.tags && job.tags.length > 0 ? (
                job.tags.map((tag, index) => (
                  <EnhancedChip
                    id={`tag-chip-${index}`}
                    key={index}
                    testId={`tag-chip-${index}`}
                    label={tag}
                    showDeleteIcon={false}
                  />
                ))
              ) : (
                <span className={styles.emptyState}>No tags available</span>
              )}
            </div>
          </div>

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
        {/* Company Name */}
        <EnhancedTextField
          label="Company"
          value={formData.companyName}
          onChange={handleChange('companyName')}
          placeholder="e.g. Amazon"
          disabled={isLoading}
        />

        {/* Position Title */}
        <EnhancedTextField
          label="Position Title"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="e.g. SDE II"
          disabled={isLoading}
        />

        {/* Location */}
        <EnhancedTextField
          label="Location"
          value={formData.location}
          onChange={handleChange('location')}
          placeholder="e.g. Bangalore, IN"
          disabled={isLoading}
        />

        {/* Currency & Salary */}
        <div className={styles.row}>
          <div className={styles.field2}>
            <EnhancedTextField
              label="Currency"
              value={formData.currency}
              onChange={handleChange('currency')}
              placeholder="IND"
              disabled={isLoading}
            />
          </div>
          <div className={styles.field3}>
            <EnhancedTextField
              label="Salary"
              value={formData.salary}
              onChange={handleChange('salary')}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Job Type */}
        <EnhancedTextField
          label="Job Type"
          value={formData.jobType}
          onChange={handleChange('jobType')}
          placeholder="Full-time"
          disabled={isLoading}
        />

        {/* Status */}
        <EnhancedSelectDropdown
          label="Application Status"
          testId="status-dropdown"
          value={formData.status}
          onChange={handleChange('status') as never}
          disabled={isLoading}
          options={[
            { value: 'draft', label: 'Draft', dataId: 'draft' },
            { value: 'applied', label: 'Applied', dataId: 'applied' },
            { value: 'interview', label: 'Interview', dataId: 'interview' },
            { value: 'offer', label: 'Offer', dataId: 'offer' },
            { value: 'rejected', label: 'Rejected', dataId: 'rejected' },
          ]}
        />

        {/* Job Posting URL */}
        <EnhancedTextField
          label="Job Posting URL"
          value={formData.jobPostingUrl}
          onChange={handleChange('jobPostingUrl')}
          placeholder="https://..."
          type="url"
          disabled={isLoading}
        />

        {/* Description */}
        <EnhancedAccordion title="Job Description">
          <EnhancedTextInputArea
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Paste job description here..."
            disabled={isLoading}
          />
        </EnhancedAccordion>

        {/* Requirements */}
        <EnhancedAccordion title="Requirements">
          <EnhancedTextInputArea
            value={formData.requirements}
            onChange={handleChange('requirements')}
            placeholder="Paste job requirements here..."
            disabled={isLoading}
          />
        </EnhancedAccordion>

        {/* Key Skills */}
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
                disabled={isLoading}
                helperText="Press Enter to add"
              />
            </div>
            <div className={styles.addButtonContainer}>
              <EnhancedButton
                label="Add"
                colorTheme="secondary"
                onClick={() => handleAddChip('keySkills', skillInput, setSkillInput)}
                disabled={isLoading || !skillInput.trim()}
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

        {/* Tags */}
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
                disabled={isLoading}
                helperText="Press Enter to add"
              />
            </div>
            <div className={styles.addButtonContainer}>
              <EnhancedButton
                label="Add"
                colorTheme="secondary"
                onClick={() => handleAddChip('tags', tagInput, setTagInput)}
                disabled={isLoading || !tagInput.trim()}
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

export default JobOverviewTab;
