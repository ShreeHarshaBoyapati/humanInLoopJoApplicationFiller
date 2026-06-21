import { createFileRoute, useSearch } from '@tanstack/react-router';
import type { JobStatus } from '@repo/shared-types';
import { JobTrackerSection } from '../components/job-tracker-section';

interface JobTrackerSearchSchema {
  status?: JobStatus;
  jobId?: string;
  personaId?: string;
  date?: string;
}

export const Route = createFileRoute('/job-tracker')({
  component: JobTrackerPage,
  validateSearch: (search: Record<string, unknown>): JobTrackerSearchSchema => {
    return {
      status: search.status as JobStatus | undefined,
      jobId: search.jobId as string | undefined,
      personaId: search.personaId as string | undefined,
      date: search.date as string | undefined,
    };
  },
});

function JobTrackerPage() {
  const search = useSearch({ from: '/job-tracker' }) as JobTrackerSearchSchema;

  return <JobTrackerSection initialStatus={search.status} initialPersonaId={search.personaId} />;
}
