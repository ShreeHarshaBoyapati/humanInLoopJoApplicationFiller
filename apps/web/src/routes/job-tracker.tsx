import { createFileRoute, useSearch } from '@tanstack/react-router';
import type { JobStatus } from '@repo/shared-types';
import { JobTrackerSection } from '../components/job-tracker-section';

type JobTrackerTab = 'active' | 'archived' | 'calendar';

interface JobTrackerSearchSchema {
  status?: JobStatus;
  jobId?: string;
  personaName?: string;
  date?: string;
  tab?: JobTrackerTab;
}

export const Route = createFileRoute('/job-tracker')({
  component: JobTrackerPage,
  validateSearch: (search: Record<string, unknown>): JobTrackerSearchSchema => {
    return {
      status: search.status as JobStatus | undefined,
      jobId: search.jobId as string | undefined,
      personaName: search.personaName as string | undefined,
      date: search.date as string | undefined,
      tab: search.tab as JobTrackerTab | undefined,
    };
  },
});

function JobTrackerPage() {
  const search = useSearch({ from: '/job-tracker' }) as JobTrackerSearchSchema;

  return (
    <JobTrackerSection
      initialStatus={search.status}
      initialPersonaName={search.personaName}
      initialJobId={search.jobId}
      initialTab={search.tab}
      initialDate={search.date}
    />
  );
}
