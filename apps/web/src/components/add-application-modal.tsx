import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import {
  Modal,
  EnhancedTextField,
  EnhancedButton,
  EnhancedSelectDropdown,
  EnhancedChip,
  EnhancedTextInputArea,
  EnhancedAccordion,
} from '@repo/ui';
import type { CreateJobInput } from '@repo/shared-types';
import { useCreateJob } from '../hooks/use-jobs';
import { useStore } from '../store';
import styles from './style/add-application-modal.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

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

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddApplicationModal({ isOpen, onClose, onSuccess }: AddApplicationModalProps) {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [tagInput, setTagInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const createJob = useCreateJob();
  const showSnackbar = useStore((state) => state.showSnackbar);

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
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      showSnackbar('Please fix the errors before saving.', { severity: 'error' });
      return;
    }

    const payload: CreateJobInput = {
      title: formData.title,
      companyName: formData.companyName,
      persona: formData.persona,
      status: formData.status,
      acceptanceLevel: Number(formData.acceptanceLevel) || 0,
      notes: formData.notes,
      keySkills: formData.keySkills,
      tags: formData.tags,
      description: formData.description,
      requirements: formData.requirements,
    };

    createJob.mutate(payload, {
      onSuccess: () => {
        showSnackbar('Job created successfully!', { severity: 'success' });
        setFormData(initialFormData);
        setFormErrors({});
        onClose();
        onSuccess?.();
      },
      onError: (error) => {
        showSnackbar(error instanceof Error ? error.message : 'Failed to create job', {
          severity: 'error',
        });
      },
    });
  }, [formData, createJob, showSnackbar, onClose, onSuccess]);

  const handleClose = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setTagInput('');
    setSkillInput('');
    onClose();
  };

  const isLoading = createJob.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      headerTitle="Add Job"
      customProps={{
        childProps: {
          body: {
            className: scrollStyles.scrollbarVerticalContainer,
            sx: { maxHeight: '70vh', overflowY: 'auto' },
          },
        },
      }}
      footer={
        <div className={styles.footerContainer}>
          <EnhancedButton
            label="Cancel"
            colorTheme="secondary"
            onClick={handleClose}
            disabled={isLoading}
          />
          <EnhancedButton
            label="Add"
            colorTheme="primary"
            onClick={handleSubmit}
            disabled={isLoading}
          />
        </div>
      }
    >
      <div className={styles.formContainer}>
        <EnhancedTextField
          label="Company"
          value={formData.companyName}
          onChange={handleChange('companyName')}
          placeholder="e.g. Amazon"
          disabled={isLoading}
          variant={formErrors.companyName ? 'error' : 'default'}
          helperText={formErrors.companyName || 'Enter the company name.'}
        />

        <EnhancedTextField
          label="Position Title"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="e.g. SDE II"
          disabled={isLoading}
          variant={formErrors.title ? 'error' : 'default'}
          helperText={formErrors.title || 'Enter the position title.'}
        />

        <EnhancedTextField
          label="Location"
          value={formData.location}
          onChange={handleChange('location')}
          placeholder="e.g. Bangalore, IN"
          disabled={isLoading}
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
              disabled={isLoading}
              variant={formErrors.currency ? 'error' : 'default'}
              helperText={formErrors.currency}
            />
          </div>
          <div className={styles.field3}>
            <EnhancedTextField
              label="Salary"
              value={formData.salary}
              onChange={handleChange('salary')}
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
            disabled={isLoading}
            variant={formErrors.description ? 'error' : 'default'}
            helperText={formErrors.description}
          />
        </EnhancedAccordion>

        <EnhancedAccordion title="Notes (Markdown supported)">
          <EnhancedTextInputArea
            value={formData.notes}
            onChange={handleChange('notes')}
            placeholder="Add your personal notes or markdown content here..."
            disabled={isLoading}
            variant={formErrors.notes ? 'error' : 'default'}
            helperText={formErrors.notes}
          />
        </EnhancedAccordion>

        <EnhancedAccordion title="Requirements">
          <EnhancedTextInputArea
            value={formData.requirements}
            onChange={handleChange('requirements')}
            placeholder="Paste job requirements here..."
            disabled={isLoading}
            variant={formErrors.requirements ? 'error' : 'default'}
            helperText={formErrors.requirements}
          />
        </EnhancedAccordion>

        <EnhancedSelectDropdown
          label="Application Status"
          testId="status-dropdown"
          value={formData.status}
          onChange={handleChange('status') as never}
          disabled={isLoading}
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
          disabled={isLoading}
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
                disabled={isLoading}
                variant={formErrors.keySkills ? 'error' : 'default'}
                helperText={formErrors.keySkills || 'Press Enter to add'}
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
                variant={formErrors.tags ? 'error' : 'default'}
                helperText={formErrors.tags || 'Press Enter to add'}
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
      </div>
    </Modal>
  );
}

export default AddApplicationModal;
