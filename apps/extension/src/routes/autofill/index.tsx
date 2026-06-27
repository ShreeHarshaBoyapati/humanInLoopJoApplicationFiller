import { Job, JobList } from '@repo/shared-types';
import styleConstants from '@repo/ui/constants/style-constants.js';
import { createFileRoute, ErrorComponent, useNavigate } from '@tanstack/react-router';
import AutofillWizard from '../../components/auto-fill-wizard';

export interface JobSearch {
  jobId?: string;
  step?: number;
}

type JobFetchList =
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      data: JobList;
    };

export const Route = createFileRoute('/autofill/')({
  shouldReload: true,
  validateSearch: (search: Record<string, unknown>): JobSearch => {
    return {
      jobId: search.jobId as string | undefined,
      step: search.step ? Number(search.step) : undefined,
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
          { action: 'GET_JOBS', payload: { limit: 1, id: jobId } },
          (res: JobFetchList) => {
            if (res?.success && res.data?.jobs) {
              const job = res.data.jobs[0] || null;
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
  pendingComponent: () => (
    <div style={{ color: styleConstants.white700, padding: '1rem' }}>Loading job data...</div>
  ),
  errorComponent: ErrorComponent,
});

function JobComponent() {
  const navigate = useNavigate();
  const { jobData, isEditing, error: loaderError } = Route.useLoaderData();
  const { step: stepParam } = Route.useSearch();

  const handleComplete = (jobId: string) => {
    console.log('Job saved/updated:', jobId);
    navigate({ to: '/' });
  };

  if (loaderError) {
    return (
      <div style={{ color: styleConstants.white900, padding: '1rem' }}>
        <p>Error: {loaderError}</p>
      </div>
    );
  }

  return (
    <AutofillWizard
      jobData={jobData}
      isEditing={isEditing}
      initialStep={stepParam}
      onComplete={handleComplete}
    />
  );
}
