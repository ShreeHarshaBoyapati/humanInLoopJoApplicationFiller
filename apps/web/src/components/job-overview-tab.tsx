import { useState, useCallback } from 'react';
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
import { useUpdateJob } from '../hooks/use-jobs';
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
  status: string;
  description: string;
  requirements: string;
  keySkills: string[];
  tags: string[];
}

export function JobOverviewTab({ job, onJobUpdate }: JobOverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<JobEditFormData>({
    companyName: job.companyName || '',
    title: job.title || '',
    status: job.status || 'draft',
    description: job.description || '',
    requirements: job.requirements || '',
    keySkills: job.keySkills || [],
    tags: job.tags || [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [tagInput, setTagInput] = useState('');

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
    // Reset form data to current job values when entering edit mode
    setFormData({
      companyName: job.companyName || '',
      title: job.title || '',
      status: job.status || 'draft',
      description: job.description || '',
      requirements: job.requirements || '',
      keySkills: job.keySkills || [],
      tags: job.tags || [],
    });
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setSkillInput('');
    setTagInput('');
  };

  const handleSaveClick = useCallback(async () => {
    const payload: UpdateJobInput = {
      id: job.id,
      title: formData.title,
      companyName: formData.companyName,
      status: formData.status,
      description: formData.description || undefined,
      requirements: formData.requirements || undefined,
      keySkills: formData.keySkills.length > 0 ? formData.keySkills : undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    };

    updateJob.mutate(payload, {
      onSuccess: (updatedJob) => {
        showSnackbar('Job updated successfully!', { severity: 'success' });
        setIsEditing(false);
        setSkillInput('');
        setTagInput('');
        // Notify parent component about the update
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
  }, [formData, job.id, updateJob, showSnackbar, onJobUpdate]);

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      active: 'Active',
      archived: 'Archived',
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
        <div className={styles.viewContainer}>
          {/* Status Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Status</label>
            <div className={styles.fieldValue}>
              <span className={styles.statusBadge}>{getStatusLabel(job.status)}</span>
            </div>
          </div>

          {/* Description Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Description</label>
            <div className={`${styles.textContent} ${scrollStyles.scrollbarVerticalContainer}`}>
              {job.description ? (
                <div>{job.description}</div>
              ) : (
                <span className={styles.emptyState}>No description available</span>
              )}
            </div>
          </div>

          {/* Requirements Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Requirements</label>
            <div className={`${styles.textContent} ${scrollStyles.scrollbarVerticalContainer}`}>
              {job.requirements ? (
                <div>{job.requirements}</div>
              ) : (
                <span className={styles.emptyState}>No requirements available</span>
              )}
            </div>
          </div>

          {/* Key Skills Field */}
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

          {/* Tags Field */}
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

        {/* Status */}
        <EnhancedSelectDropdown
          label="Application Status"
          testId="status-dropdown"
          value={formData.status}
          onChange={handleChange('status') as never}
          disabled={isLoading}
          options={[
            { value: 'draft', label: 'Draft (Not yet applied)', dataId: 'draft' },
            { value: 'applied', label: 'Applied', dataId: 'applied' },
            { value: 'interview', label: 'Interview', dataId: 'interview' },
            { value: 'offer', label: 'Offer', dataId: 'offer' },
            { value: 'rejected', label: 'Rejected', dataId: 'rejected' },
            { value: 'active', label: 'Active', dataId: 'active' },
            { value: 'archived', label: 'Archived', dataId: 'archived' },
          ]}
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
