import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Modal,
  EnhancedTextField,
  EnhancedButton,
  EnhancedAutocompleteDropdown,
  EnhancedTextInputArea,
  EnhancedTooltipWithText,
  DatePicker,
  TimePicker,
} from '@repo/ui';
import dayjs from 'dayjs';
import type { AutocompleteOption } from '@repo/ui';
import type { CreateEventInput, Event, Job, Tag, UpdateEventInput } from '@repo/shared-types';
import { useStore } from '../store';
import { useCreateEvent, useUpdateEvent } from '../hooks/use-events';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '../hooks/use-tags';
import { useJobs } from '../hooks/use-jobs';
import { ConfirmModal } from './confirm-modal';
import styles from './style/add-event-modal.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

const RESERVED_TASK_TAG = 'task';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string;
  initialJob?: Job | null;
  initialTag?: Tag | null;
  eventToEdit?: Event | null;
}

interface FormState {
  title: string;
  description: string;
  date: string;
  time: string;
  tagId: string;
  jobId: string;
}

const emptyForm: FormState = {
  title: '',
  description: '',
  date: '',
  time: '',
  tagId: '',
  jobId: '',
};

function toDateInput(date: string): string {
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return '';
}

function toTimeInput(time: string | null): string {
  if (!time) return '';
  const parsed = dayjs(time, ['HH:mm', 'HH:mm:ss'], true);
  return parsed.isValid() ? parsed.format('HH:mm') : '';
}

export function AddEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialJob,
  initialTag,
  eventToEdit,
}: AddEventModalProps) {
  const [view, setView] = useState<'form' | 'manageTags'>('form');
  const [form, setForm] = useState<FormState>(() => {
    const initialDateValue = toDateInput(initialDate ?? '');
    if (eventToEdit) {
      return {
        title: eventToEdit.title,
        description: eventToEdit.description,
        date: initialDateValue || toDateInput(eventToEdit.date),
        time: toTimeInput(eventToEdit.time),
        tagId: eventToEdit.tagId ?? '',
        jobId: eventToEdit.jobId ?? '',
      };
    }
    return {
      ...emptyForm,
      date: initialDateValue,
      jobId: initialJob?.id ?? '',
    };
  });
  const [tagSearch, setTagSearch] = useState('');
  const [debouncedTagSearch, setDebouncedTagSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [debouncedJobSearch, setDebouncedJobSearch] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const showSnackbar = useStore((state) => state.showSnackbar);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const isEdit = Boolean(eventToEdit);

  const buildInitialForm = useCallback((): FormState => {
    const initialDateValue = toDateInput(initialDate ?? '');
    if (eventToEdit) {
      return {
        title: eventToEdit.title,
        description: eventToEdit.description,
        date: initialDateValue || toDateInput(eventToEdit.date),
        time: toTimeInput(eventToEdit.time),
        tagId: eventToEdit.tagId ?? '',
        jobId: eventToEdit.jobId ?? '',
      };
    }
    return {
      ...emptyForm,
      date: initialDateValue,
      jobId: initialJob?.id ?? '',
    };
  }, [eventToEdit, initialDate, initialJob]);

  useEffect(() => {
    if (!isOpen) {
      setView('form');
      setForm(emptyForm);
      setErrors({});
      setTagSearch('');
      setDebouncedTagSearch('');
      setJobSearch('');
      setDebouncedJobSearch('');
      return;
    }
    const initialForm = buildInitialForm();
    setForm(initialForm);
    setView('form');
    setErrors({});
    const initialJobLabel = initialJob
      ? `${initialJob.title} @ ${initialJob.companyName || '—'}`
      : '';
    if (eventToEdit) {
      setTagSearch(initialTag?.name ?? '');
      setDebouncedTagSearch(initialTag?.name ?? '');
      setJobSearch(initialJobLabel);
      setDebouncedJobSearch(initialJobLabel);
    } else {
      setTagSearch('');
      setDebouncedTagSearch('');
      setJobSearch(initialJobLabel);
      setDebouncedJobSearch(initialJobLabel);
    }
  }, [isOpen, buildInitialForm, eventToEdit, initialJob, initialTag]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedJobSearch(jobSearch), 300);
    return () => clearTimeout(timer);
  }, [jobSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTagSearch(tagSearch), 300);
    return () => clearTimeout(timer);
  }, [tagSearch]);

  const {
    data: tagsData,
    refetch: refetchTags,
    isFetching: isFetchingTags,
  } = useTags({
    search: debouncedTagSearch,
    limit: 200,
  });

  const tags = useMemo(() => tagsData?.tags ?? [], [tagsData]);
  const isTagListLoading = isFetchingTags || (debouncedTagSearch === '' && !tagsData);

  const {
    data: jobsPages,
    isFetching: isFetchingJobs,
    refetch: refetchJobs,
  } = useJobs({
    limit: 50,
    searchQuery: debouncedJobSearch,
  });
  const jobs = useMemo(() => jobsPages?.pages.flatMap((p) => p.items) ?? [], [jobsPages]);
  const jobTotal = jobsPages?.pages[0]?.total ?? 0;
  const isJobListTruncated = jobTotal > 50;
  const isJobListLoading = isFetchingJobs || (debouncedJobSearch === '' && !jobsPages);

  const selectedTag = useMemo(
    () => tags.find((t) => t.id === form.tagId) ?? null,
    [tags, form.tagId]
  );
  const isTaskTagSelected = selectedTag?.name === RESERVED_TASK_TAG;

  useEffect(() => {
    if (isTaskTagSelected && form.jobId) {
      setForm((prev) => ({ ...prev, jobId: '' }));
    }
  }, [isTaskTagSelected, form.jobId]);

  const tagOptions = useMemo<AutocompleteOption[]>(() => {
    if (form.tagId && initialTag && !tags.find((t) => t.id === form.tagId)) {
      return [{ value: form.tagId, label: initialTag.name }];
    }
    return tags.map((t) => ({ value: t.id, label: t.name }));
  }, [tags, initialTag, form.tagId]);

  const jobOptions = useMemo<AutocompleteOption[]>(() => {
    if (form.jobId && initialJob && !jobs.find((j) => j.id === form.jobId)) {
      return [
        { value: form.jobId, label: `${initialJob.title} @ ${initialJob.companyName || '—'}` },
      ];
    }
    return jobs.map((j) => ({
      value: j.id,
      label: `${j.title} @ ${j.companyName || '—'}`,
    }));
  }, [jobs, initialJob, form.jobId]);

  const selectedTagOption = useMemo(
    () => (form.tagId ? (tagOptions.find((o) => o.value === form.tagId) ?? null) : null),
    [form.tagId, tagOptions]
  );
  const selectedJobOption = useMemo(
    () => (form.jobId ? (jobOptions.find((o) => o.value === form.jobId) ?? null) : null),
    [form.jobId, jobOptions]
  );
  const tagValueForDropdown = useMemo(
    () => (selectedTagOption && tagSearch === selectedTagOption.label ? selectedTagOption : null),
    [selectedTagOption, tagSearch]
  );
  const jobValueForDropdown = useMemo(
    () => (selectedJobOption && jobSearch === selectedJobOption.label ? selectedJobOption : null),
    [selectedJobOption, jobSearch]
  );

  const handleChange = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.date) next.date = 'Date is required';
    if (form.time && !/^\d{2}:\d{2}$/.test(form.time)) next.time = 'Invalid time format';
    if (!form.tagId) next.tagId = 'Tag is required';
    if (!isTaskTagSelected && !form.jobId) {
      next.jobId = 'Job is required for non-task tag events';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, isTaskTagSelected]);

  const handleSubmit = useCallback(() => {
    if (!validate()) {
      showSnackbar('Please fix the errors before saving.', { severity: 'error' });
      return;
    }
    const tag = tags.find((t) => t.id === form.tagId);
    const isTask = tag?.name === RESERVED_TASK_TAG;
    if (isTask && form.jobId) {
      showSnackbar('Task events cannot be linked to a job.', { severity: 'error' });
      return;
    }
    const baseFields = {
      title: form.title.trim(),
      description: form.description,
      date: form.date,
      time: form.time ? form.time : null,
      tagId: form.tagId,
      jobId: isTask ? null : form.jobId || null,
    };
    const onSuccessCb = () => {
      showSnackbar(isEdit ? 'Event updated successfully!' : 'Event created successfully!', {
        severity: 'success',
      });
      onSuccess?.();
      onClose();
    };
    const onErrorCb = (error: unknown) => {
      showSnackbar(error instanceof Error ? error.message : 'Failed to save event', {
        severity: 'error',
      });
    };
    if (isEdit) {
      updateEvent.mutate({ id: eventToEdit!.id, ...baseFields } as UpdateEventInput, {
        onSuccess: onSuccessCb,
        onError: onErrorCb,
      });
    } else {
      createEvent.mutate(baseFields as CreateEventInput, {
        onSuccess: onSuccessCb,
        onError: onErrorCb,
      });
    }
  }, [
    form,
    isEdit,
    eventToEdit,
    tags,
    validate,
    createEvent,
    updateEvent,
    showSnackbar,
    onSuccess,
    onClose,
  ]);

  const handleClose = () => {
    if (createEvent.isPending || updateEvent.isPending) return;
    onClose();
  };

  const handleViewChange = (next: 'form' | 'manageTags') => {
    setView(next);
  };

  const headerTitle = view === 'form' ? (isEdit ? 'Edit Event' : 'Add Event') : 'Tags';

  const isSaving = createEvent.isPending || updateEvent.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      headerTitle={headerTitle}
      headerLeftElement={
        view === 'manageTags' ? (
          <button
            type="button"
            className={styles.backButton}
            onClick={() => handleViewChange('form')}
            aria-label="Back"
          >
            <ArrowBackIcon sx={{ fontSize: '1.25rem' }} />
          </button>
        ) : undefined
      }
      customProps={{
        childProps: {
          modal: { sx: { maxWidth: '560px', minWidth: '420px' } },
          body:
            view === 'manageTags'
              ? {
                  sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '70vh',
                    overflowY: 'hidden',
                    padding: 0,
                  },
                }
              : {
                  className: scrollStyles.scrollbarVerticalContainer,
                  sx: { maxHeight: '70vh', overflowY: 'auto', padding: 0 },
                },
        },
      }}
      footer={
        view === 'form' ? (
          <div className={styles.footerContainer}>
            <EnhancedButton
              label="Cancel"
              colorTheme="secondary"
              onClick={handleClose}
              disabled={isSaving}
            />
            <EnhancedButton
              label={isEdit ? 'Save' : 'Add'}
              colorTheme="primary"
              onClick={handleSubmit}
              disabled={isSaving}
            />
          </div>
        ) : undefined
      }
    >
      {view === 'form' ? (
        <FormView
          form={form}
          errors={errors}
          tagOptions={tagOptions}
          jobOptions={jobOptions}
          selectedTagOption={tagValueForDropdown}
          selectedJobOption={jobValueForDropdown}
          isTaskTagSelected={isTaskTagSelected}
          isTaskTagRestricted={Boolean(initialJob)}
          isTagListLoading={isTagListLoading}
          isJobListLoading={isJobListLoading}
          isJobListTruncated={isJobListTruncated}
          tagSearch={tagSearch}
          jobSearch={jobSearch}
          onChange={handleChange}
          onTagSearchChange={setTagSearch}
          onJobSearchChange={setJobSearch}
          onTagDropdownOpen={() => {
            void refetchTags();
          }}
          onJobDropdownOpen={() => {
            void refetchJobs();
          }}
          onManageClick={() => handleViewChange('manageTags')}
          onDeleteSelectedTag={(tagId) => {
            if (form.tagId === tagId) setForm((prev) => ({ ...prev, tagId: '' }));
          }}
        />
      ) : (
        <ManageTagsView />
      )}
    </Modal>
  );
}

interface FormViewProps {
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  tagOptions: AutocompleteOption[];
  jobOptions: AutocompleteOption[];
  selectedTagOption: AutocompleteOption | null;
  selectedJobOption: AutocompleteOption | null;
  isTaskTagSelected: boolean;
  isTaskTagRestricted: boolean;
  isTagListLoading: boolean;
  isJobListLoading: boolean;
  isJobListTruncated: boolean;
  tagSearch: string;
  jobSearch: string;
  onChange: (field: keyof FormState) => (value: string) => void;
  onTagSearchChange: (value: string) => void;
  onJobSearchChange: (value: string) => void;
  onTagDropdownOpen: () => void;
  onJobDropdownOpen: () => void;
  onManageClick: () => void;
  onDeleteSelectedTag: (tagId: string) => void;
}

function FormView({
  form,
  errors,
  tagOptions,
  jobOptions,
  selectedTagOption,
  selectedJobOption,
  isTaskTagSelected,
  isTaskTagRestricted,
  isTagListLoading,
  isJobListLoading,
  isJobListTruncated,
  tagSearch,
  jobSearch,
  onChange,
  onTagSearchChange,
  onJobSearchChange,
  onTagDropdownOpen,
  onJobDropdownOpen,
  onManageClick,
}: FormViewProps) {
  return (
    <div className={styles.formContainer}>
      <EnhancedTextField
        label="Title"
        value={form.title}
        onChange={(e) => onChange('title')(String(e.target.value))}
        placeholder="e.g. Follow up email"
        variant={errors.title ? 'error' : 'default'}
        helperText={errors.title}
      />

      <div className={styles.row}>
        <EnhancedAutocompleteDropdown
          id="event-tag-select"
          testId="event-tag-select"
          label="Type"
          placeholder="Search tags..."
          options={tagOptions}
          value={selectedTagOption}
          inputValue={tagSearch}
          onChange={(newValue) => onChange('tagId')(newValue ? String(newValue.value) : '')}
          onInputChange={onTagSearchChange}
          onOpen={onTagDropdownOpen}
          loading={isTagListLoading}
          loadingText="Loading tags..."
          error={Boolean(errors.tagId)}
          showErrorMsg={Boolean(errors.tagId)}
          errorText={errors.tagId}
        />
        <div className={styles.manageButton}>
          <EnhancedButton label="Manage" colorTheme="secondary" onClick={onManageClick} />
        </div>
      </div>

      <EnhancedAutocompleteDropdown
        id="event-job-select"
        testId="event-job-select"
        label="Job"
        placeholder="Search jobs..."
        options={jobOptions}
        value={selectedJobOption}
        inputValue={jobSearch}
        onChange={(newValue) => onChange('jobId')(newValue ? String(newValue.value) : '')}
        onInputChange={onJobSearchChange}
        onOpen={onJobDropdownOpen}
        loading={isJobListLoading}
        loadingText="Loading jobs..."
        disabled={isTaskTagSelected}
        error={Boolean(errors.jobId)}
        showErrorMsg={Boolean(errors.jobId)}
        errorText={errors.jobId}
        showSupportingText={isTaskTagSelected}
        supportingText="Task events do not belong to a job."
        listboxFooter={
          isJobListTruncated ? (
            <span className={styles.jobFilterFooter}>
              Showing first 50 jobs. Type to search for more.
            </span>
          ) : undefined
        }
      />

      {isTaskTagRestricted && (
        <EnhancedTextField
          label="Note"
          value="Task events aren't allowed for a specific job."
          disabled
        />
      )}

      <div className={styles.row}>
        <DatePicker
          label="Date"
          value={form.date ? dayjs(form.date) : null}
          onChange={(value) => {
            onChange('date')(value ? value.format('YYYY-MM-DD') : '');
          }}
          error={Boolean(errors.date)}
          helperText={errors.date}
        />
        <TimePicker
          label="Time"
          value={form.time ? dayjs(form.time, 'HH:mm') : null}
          onChange={(value) => {
            onChange('time')(value ? value.format('HH:mm') : '');
          }}
          error={Boolean(errors.time)}
          helperText={errors.time || 'Leave blank for an all-day event.'}
          ampm={false}
          timeSteps={{ minutes: 1 }}
        />
      </div>

      <EnhancedTextInputArea
        label="Description (Markdown supported)"
        value={form.description}
        onChange={(e) => onChange('description')(String(e.target.value))}
        placeholder="Add any extra details about the event..."
        minRows={4}
        maxRows={8}
      />
    </div>
  );
}

function ManageTagsView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const showSnackbar = useStore((state) => state.showSnackbar);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: tagsData, refetch } = useTags({ search: debouncedSearch, limit: 200 });
  const tags = tagsData?.tags ?? [];

  const handleEditClick = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleEditSave = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showSnackbar('Tag name cannot be empty', { severity: 'error' });
      return;
    }
    updateTag.mutate(
      { id, name: trimmed },
      {
        onSuccess: () => {
          showSnackbar('Tag updated successfully!', { severity: 'success' });
          setEditingId(null);
          setEditingName('');
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to update tag', {
            severity: 'error',
          });
        },
      }
    );
  };

  const handleAddTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      showSnackbar('Tag name cannot be empty', { severity: 'error' });
      return;
    }
    createTag.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          showSnackbar('Tag created successfully!', { severity: 'success' });
          setNewTagName('');
          setShowInlineAdd(false);
          void refetch();
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to create tag', {
            severity: 'error',
          });
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return;
    deleteTag.mutate(
      { id: pendingDelete.id },
      {
        onSuccess: () => {
          showSnackbar('Tag deleted successfully!', { severity: 'success' });
          setPendingDelete(null);
          void refetch();
        },
        onError: (error) => {
          showSnackbar(error instanceof Error ? error.message : 'Failed to delete tag', {
            severity: 'error',
          });
        },
      }
    );
  };

  const editInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  return (
    <div className={styles.manageTagsContainer}>
      <div className={styles.searchRow}>
        <EnhancedTextField
          label="Search tags"
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(String(e.target.value))}
        />
        <div className={styles.manageButton}>
          <EnhancedButton
            label="+ Add tag"
            colorTheme="primary"
            onClick={() => setShowInlineAdd(true)}
            disabled={showInlineAdd}
          />
        </div>
      </div>

      {showInlineAdd && (
        <div className={styles.inlineAddRow}>
          <EnhancedTextField
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(String(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              } else if (e.key === 'Escape') {
                setShowInlineAdd(false);
                setNewTagName('');
              }
            }}
            customProps={{
              childProps: { textfieldBox: { sx: { flex: 1 } } },
            }}
          />
          <button
            type="button"
            className={`${styles.tagIconButton} ${styles.tagIconSave}`}
            onClick={handleAddTag}
            aria-label="Add tag"
            disabled={createTag.isPending}
          >
            <CheckIcon sx={{ fontSize: '1.1rem' }} />
          </button>
          <button
            type="button"
            className={`${styles.tagIconButton} ${styles.tagIconCancel}`}
            onClick={() => {
              setShowInlineAdd(false);
              setNewTagName('');
            }}
            aria-label="Cancel"
          >
            <CloseIcon sx={{ fontSize: '1.1rem' }} />
          </button>
        </div>
      )}

      <hr className={styles.divider} />

      <div className={`${styles.tagsList} ${scrollStyles.scrollbarVerticalContainer}`}>
        {tags.length === 0 ? (
          <span style={{ color: 'var(--white-700)', fontSize: '0.875rem' }}>No tags yet</span>
        ) : (
          tags.map((tag) => {
            const isTask = tag.name === RESERVED_TASK_TAG;
            const isEditing = editingId === tag.id;
            return (
              <div className={styles.tagRow} key={tag.id}>
                <span className={styles.tagSwatch} style={{ backgroundColor: tag.color }} />
                {isEditing ? (
                  <div className={styles.tagEditInput}>
                    <EnhancedTextField
                      value={editingName}
                      onChange={(e) => setEditingName(String(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditSave(tag.id);
                        } else if (e.key === 'Escape') {
                          handleEditCancel();
                        }
                      }}
                      customProps={{
                        childProps: { textfieldBox: { sx: { width: '100%' } } },
                      }}
                    />
                  </div>
                ) : (
                  <span className={styles.tagName}>{tag.name}</span>
                )}
                <div className={styles.tagActions}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.tagIconButton} ${styles.tagIconSave}`}
                        onClick={() => handleEditSave(tag.id)}
                        aria-label="Save"
                        disabled={updateTag.isPending}
                      >
                        <CheckIcon sx={{ fontSize: '1rem' }} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.tagIconButton} ${styles.tagIconCancel}`}
                        onClick={handleEditCancel}
                        aria-label="Cancel"
                      >
                        <CloseIcon sx={{ fontSize: '1rem' }} />
                      </button>
                    </>
                  ) : (
                    <>
                      {!isTask && (
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleEditClick(tag.id, tag.name)}
                          aria-label="Edit tag"
                        >
                          <EditIcon sx={{ fontSize: '1.25rem' }} />
                        </button>
                      )}
                      <EnhancedTooltipWithText
                        description={isTask ? 'Reserved tag cannot be deleted' : 'Delete tag'}
                        showIcon={false}
                        placement="top"
                      >
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.delete}`}
                          onClick={() => {
                            if (!isTask) setPendingDelete({ id: tag.id, name: tag.name });
                          }}
                          aria-label="Delete tag"
                          disabled={isTask}
                        >
                          <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                        </button>
                      </EnhancedTooltipWithText>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete Tag"
        message={
          pendingDelete
            ? `Are you sure you want to delete the tag "${pendingDelete.name}"? Any events using it will be deleted.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteTag.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleteTag.isPending) setPendingDelete(null);
        }}
      />
    </div>
  );
}

export default AddEventModal;
